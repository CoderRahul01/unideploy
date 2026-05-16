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

from core.database import db_insert, db_update
from core.redis_client import redis
from routers.sessions import _sessions
from core.posthog import posthog_client

router = APIRouter(prefix="/auth", tags=["auth"])


def _generate_numeric_code() -> str:
    """6-digit numeric code, matches spec: Math.floor(100000 + Math.random() * 900000)"""
    return str(random.randint(100000, 999999))


class VerifyRequest(BaseModel):
    session_code: str


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

    base_url = os.getenv("BASE_URL", "wss://unideploy-api-4b25n74mbq-uc.a.run.app")
    return {
        "session_id": session_id,
        "session_code": code,
        "expires_in": 600,
        "websocket_url": f"{base_url}/ws/session/{session_id}",
    }


@router.post("/verify")
async def verify_session(req: VerifyRequest):
    """
    Called by browser when user enters the 6-digit code on /connect.
    Marks session as authenticated and emits session_authenticated to CLI WebSocket.
    """
    code = req.session_code.strip().replace("-", "")

    # Get from Redis — if None, it's expired or doesn't exist
    session = await redis.json_get(f"auth:{code}")
    if not session:
        raise HTTPException(status_code=404, detail="Session code not found or expired")

    session["status"] = "authenticated"
    session["authenticated_at"] = datetime.utcnow().isoformat()

    # One-time use code
    await redis.delete(f"auth:{code}")

    # WebSocket routing stays in-process
    local_session = _sessions.get(code)
    if local_session:
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

    try:
        await db_update("scans", session["session_id"], {"status": "authenticated"})
    except Exception:
        pass

    if posthog_client:
        posthog_client.capture(session["session_id"], "auth_session_verified", {
            "cli_ws_present": bool(local_session.get("cli_ws") if local_session else False),
        })

    return {
        "session_id": session["session_id"],
        "status": "authenticated",
    }
