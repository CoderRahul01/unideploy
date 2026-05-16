from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from uuid import uuid4
import random, string
from datetime import datetime
import os

from core.database import db_insert, db_update
from core.redis_client import redis
from core.posthog import posthog_client

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])

# In-memory session store for non-serialisable WebSocket handles
# Data state is in Redis (session:{session_id})
_sessions: dict[str, dict] = {}

def generate_session_code() -> str:
    """Generate XXX-XXX format. Avoid ambiguous chars."""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    p1 = ''.join(random.choices(chars, k=3))
    p2 = ''.join(random.choices(chars, k=3))
    return f"{p1}-{p2}"

class CreateSessionRequest(BaseModel):
    cli_version: str
    machine_name: str
    project_path: str = ""

class CreateSessionResponse(BaseModel):
    session_code: str
    session_id: str
    expires_in: int  # seconds
    websocket_url: str

class ConnectSessionRequest(BaseModel):
    code: str  # "ABC-DEF"

class ConnectSessionResponse(BaseModel):
    session_id: str
    websocket_url: str
    machine_name: str | None
    project_manifest: dict | None

@router.post("/create", response_model=CreateSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    x_api_key: str | None = Header(default=None)
):
    """
    Called by CLI on `unideploy init`.
    Creates a session, returns a 6-digit code and WebSocket URL.
    API key is optional for first run (anonymous session).
    """
    code = generate_session_code()
    session_id = str(uuid4())
    
    data = {
        "session_id": session_id,
        "code": code,
        "status": "pending",
        "machine_name": request.machine_name,
        "project_path": request.project_path,
        "cli_version": request.cli_version,
        "user_id": None,
        "created_at": datetime.utcnow().isoformat(),
        "findings": [],
    }

    # Primary state in Redis
    await redis.json_set(f"session:{session_id}", data, ex=600)
    # Also link code to session_id for pairing
    await redis.set(f"code:{code}", session_id, ex=600)
    
    # Process-local dict for WebSockets
    _sessions[code] = {
        **data,
        "cli_ws": None,
        "browser_ws": None,
        "message_queue": [],
    }
    
    try:
        await db_insert("scans", {
            "id": session_id,
            "session_id": session_id,
            "code": code,
            "status": "pending",
            "machine_name": request.machine_name,
            "project_path": request.project_path,
            "created_at": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass

    if posthog_client:
        posthog_client.capture(session_id, "session_created", {
            "cli_version": request.cli_version,
            "has_project_path": bool(request.project_path),
        })

    base_url = os.getenv("BASE_URL", "wss://api.unideploy.in")
    return CreateSessionResponse(
        session_code=code,
        session_id=session_id,
        expires_in=600,
        websocket_url=f"{ws_base}/ws/cli/{code}" if "ws_base" in locals() else f"{base_url}/ws/cli/{code}"
    )

@router.post("/connect", response_model=ConnectSessionResponse)
async def connect_session(
    request: ConnectSessionRequest,
):
    """
    Called by browser when user enters the 6-digit code.
    Validates code, marks session as browser_connected.
    """
    code = request.code.upper().strip()
    
    # Resolve code to session_id via Redis
    session_id = await redis.get(f"code:{code}")
    if not session_id:
        raise HTTPException(status_code=404, detail="Session code not found or expired")
    
    session = await redis.json_get(f"session:{session_id}")
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] == "complete":
        raise HTTPException(status_code=409, detail="Session already complete")
    
    session["status"] = "browser_connected"
    session["browser_connected_at"] = datetime.utcnow().isoformat()
    
    # Update Redis
    await redis.json_set(f"session:{session_id}", session, ex=600)
    
    # Update process-local dict if present
    if code in _sessions:
        _sessions[code].update(session)
    
    try:
        await db_update("scans", session_id, {
            "status": "browser_connected",
            "browser_connected_at": session["browser_connected_at"],
        })
    except Exception:
        pass

    base_url = os.getenv("BASE_URL", "wss://api.unideploy.in")
    ws_base = base_url.replace("http://", "ws://").replace("https://", "wss://")
    
    if posthog_client:
        posthog_client.capture(session_id, "session_connected", {
            "has_project_manifest": bool(session.get("project_manifest")),
        })

    return ConnectSessionResponse(
        session_id=session_id,
        websocket_url=f"{ws_base}/ws/browser/{session_id}",
        machine_name=session.get("machine_name"),
        project_manifest=session.get("project_manifest")
    )

@router.get("/{session_id}")
async def get_session_status(session_id: str):
    """Poll endpoint for session status and partial findings."""
    session = await redis.json_get(f"session:{session_id}")
    if session:
        return {
            "status": session["status"],
            "machine_name": session.get("machine_name"),
            "findings": session.get("findings", []),
            "security_grade": session.get("security_grade"),
        }
    raise HTTPException(status_code=404, detail="Session not found")

@router.delete("/{session_id}")
async def destroy_session(session_id: str):
    """Destroy session on CLI Ctrl+C or browser tab close."""
    session = await redis.json_get(f"session:{session_id}")
    if session:
        code = session.get("code")
        await redis.delete(f"session:{session_id}")
        if code:
            await redis.delete(f"code:{code}")
            if code in _sessions:
                del _sessions[code]
        
        if posthog_client:
            posthog_client.capture(session_id, "session_destroyed")
        return {"destroyed": True}
    raise HTTPException(status_code=404, detail="Session not found")
