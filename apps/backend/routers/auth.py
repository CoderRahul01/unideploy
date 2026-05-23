"""
Auth router — CLI-first session flow.
POST /auth/session → generate 6-digit numeric code + UUID session_id
POST /auth/verify  → browser enters code, emits session_authenticated to CLI WS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from uuid import uuid4
import random
from datetime import datetime
import os
import hashlib
import secrets

from core.database import db_insert, db_update, db_select
from core.redis_client import redis
from routers.sessions import _sessions
from core.posthog import posthog_client

router = APIRouter(prefix="/auth", tags=["auth"])


def _generate_numeric_code() -> str:
    """6-digit numeric code, matches spec: Math.floor(100000 + Math.random() * 900000)"""
    return str(random.randint(100000, 999999))


class VerifyRequest(BaseModel):
    session_code: str


def hash_password(password: str, salt: str = None) -> str:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(password: str, hashed_str: str) -> bool:
    try:
        salt, hashed = hashed_str.split(":")
        return hash_password(password, salt) == hashed_str
    except ValueError:
        return False


@router.post("/session")
async def create_auth_session():
    """
    Called by CLI on `npx unideploy init`.
    Returns 6-digit numeric session_code + UUID session_id.
    CLI connects WebSocket to /ws/session/{session_id} immediately after.
    """
    code = _generate_numeric_code()
    session_id = str(uuid4())

    data = {
        "session_id": session_id,
        "session_code": code,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        # legacy compat fields
        "machine_name": None,
        "project_path": "",
        "cli_version": "latest",
    }

    # Store in Redis with 10 min TTL
    await redis.json_set(f"auth:{code}", data, ex=600)

    # Maintain local dict for WebSocket handles (they can't be serialised)
    _sessions[code] = {
        **data,
        "cli_ws": None,
        "browser_ws": None,
        "message_queue": [],
        "findings": [],
        "report": None,
    }

    try:
        await db_insert("scans", {
            "id": session_id,
            "session_id": session_id,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass

    base_url = os.getenv("BASE_URL", "wss://unideploy-backend.onrender.com")
    return {
        "session_id": session_id,
        "session_code": code,
        "expires_in": 600,
        "websocket_url": f"{base_url}/ws/session/{session_id}",
    }


from fastapi import Header
import asyncio
from routers.websockets import run_agent_pipeline

@router.post("/verify")
async def verify_session(req: VerifyRequest, authorization: str = Header(None)):
    """
    Called by browser when user enters the 6-digit code on /connect.
    Marks session as authenticated, links it to user_id, and emits session_authenticated.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
        
    token = authorization.split(" ")[1]
    session_data = await redis.json_get(f"session:{token}")
    if not session_data or "user_id" not in session_data:
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_id = session_data["user_id"]
    code = req.session_code.strip().replace("-", "")

    # Get from Redis — if None, it's expired or doesn't exist
    session = await redis.json_get(f"auth:{code}")
    if not session:
        raise HTTPException(status_code=404, detail="Session code not found or expired")

    session["user_id"] = user_id
    session["status"] = "authenticated"
    session["authenticated_at"] = datetime.utcnow().isoformat()

    # One-time use code
    await redis.delete(f"auth:{code}")

    # WebSocket routing stays in-process
    local_session = _sessions.get(code)
    if local_session:
        local_session["user_id"] = user_id
        local_session["status"] = "authenticated"
        local_session["authenticated_at"] = session["authenticated_at"]
        
        auth_msg = {"type": "session_authenticated", "session_id": session["session_id"]}
        cli_ws = local_session.get("cli_ws")
        if cli_ws:
            try:
                await cli_ws.send_json(auth_msg)
            except Exception:
                pass
        else:
            local_session.setdefault("message_queue", []).append(auth_msg)
            
        if local_session.get("waiting_for_auth"):
            local_session["waiting_for_auth"] = False
            asyncio.create_task(run_agent_pipeline(code, local_session.get("project_manifest", {})))

    try:
        await db_update("scans", session["session_id"], {
            "status": "authenticated",
            "user_id": user_id
        })
    except Exception:
        pass

    if posthog_client:
        posthog_client.capture(session["session_id"], "auth_session_verified", {
            "user_id": user_id,
            "cli_ws_present": bool(local_session.get("cli_ws") if local_session else False),
        })

    return {
        "session_id": session["session_id"],
        "status": "authenticated",
    }


from schemas import UserRegisterRequest, UserLoginRequest, AuthTokenResponse

@router.post("/register", response_model=AuthTokenResponse)
async def register_user(req: UserRegisterRequest):
    # Check if user exists
    existing = await db_select("app_users", {"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = str(uuid4())
    password_hash = hash_password(req.password)
    
    # Default free tier
    user_data = {
        "id": user_id,
        "email": req.email,
        "password_hash": password_hash,
        "plan_tier": "Free",
        "scans_remaining": 10,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db_insert("app_users", user_data)
    
    # Generate token
    token = secrets.token_hex(32)
    await redis.json_set(f"session:{token}", {"user_id": user_id}, ex=2592000) # 30 days
    
    return {
        "token": token,
        "user_id": user_id,
        "plan_tier": "Free",
        "scans_remaining": 10
    }

@router.post("/login", response_model=AuthTokenResponse)
async def login_user(req: UserLoginRequest):
    users = await db_select("app_users", {"email": req.email})
    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    user = users[0]
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = secrets.token_hex(32)
    await redis.json_set(f"session:{token}", {"user_id": user["id"]}, ex=2592000) # 30 days
    
    return {
        "token": token,
        "user_id": user["id"],
        "plan_tier": user.get("plan_tier", "Free"),
        "scans_remaining": user.get("scans_remaining", 0)
    }

from fastapi import Header

@router.get("/me")
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
        
    token = authorization.split(" ")[1]
    session_data = await redis.json_get(f"session:{token}")
    if not session_data or "user_id" not in session_data:
        raise HTTPException(status_code=401, detail="Session expired")
        
    users = await db_select("app_users", {"id": session_data["user_id"]})
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = users[0]
    return {
        "user_id": user["id"],
        "email": user["email"],
        "plan_tier": user.get("plan_tier", "Free"),
        "scans_remaining": user.get("scans_remaining", 0)
    }

