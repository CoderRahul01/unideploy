from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from uuid import uuid4
import random, string
from datetime import datetime, timedelta
import os

from core.database import db_insert, db_update

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])

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

# In-memory session store (replace with Redis/Supabase in production)
_sessions: dict[str, dict] = {}

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
    expiry = datetime.utcnow() + timedelta(minutes=10)
    
    _sessions[code] = {
        "session_id": session_id,
        "code": code,
        "status": "pending",
        "machine_name": request.machine_name,
        "project_path": request.project_path,
        "cli_version": request.cli_version,
        "cli_ws": None,
        "browser_ws": None,
        "message_queue": [],
        "findings": [],
        "expires_at": expiry,
        "user_id": None,
        "created_at": datetime.utcnow()
    }
    
    try:
        await db_insert("scans", {
            "id": session_id,
            "session_id": session_id,  # session_id column is required in setup_insforge.py
            "code": code,
            "status": "pending",
            "machine_name": request.machine_name,
            "project_path": request.project_path,
            "expires_at": expiry.isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass  # InsForge persistence is best-effort; session still works locally

    base_url = os.getenv("BASE_URL", "wss://api.unideploy.in")
    return CreateSessionResponse(
        session_code=code,
        session_id=session_id,
        expires_in=600,
        websocket_url=f"{base_url}/ws/cli/{code}"
    )

@router.post("/connect", response_model=ConnectSessionResponse)
async def connect_session(
    request: ConnectSessionRequest,
):
    """
    Called by browser when user enters the 6-digit code.
    Validates code, marks session as browser_connected.
    Session-code matching serves as the authentication mechanism.
    """
    code = request.code.upper().strip()
    session = _sessions.get(code)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session code not found")
    
    if datetime.utcnow() > session["expires_at"]:
        raise HTTPException(status_code=410, detail="Session code expired")
    
    if session["status"] == "complete":
        raise HTTPException(status_code=409, detail="Session already complete")
    
    session["status"] = "browser_connected"
    session["browser_connected_at"] = datetime.utcnow()
    session["user_id"] = None  # future: populate from auth provider
    
    try:
        await db_update("scans", session["session_id"], {
            "status": "browser_connected",
            "browser_connected_at": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass

    base_url = os.getenv("BASE_URL", "wss://api.unideploy.in").replace("wss://", "ws://").replace("https://", "ws://").replace("http://", "ws://")
    
    ws_base = base_url.replace("http://", "ws://").replace("https://", "wss://")
    return ConnectSessionResponse(
        session_id=session["session_id"],
        websocket_url=f"{ws_base}/ws/browser/{session['session_id']}",
        machine_name=session.get("machine_name"),
        project_manifest=session.get("project_manifest")
    )

@router.get("/{session_id}")
async def get_session_status(session_id: str):
    """Poll endpoint for session status and partial findings."""
    for code, session in _sessions.items():
        if session["session_id"] == session_id:
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
    for code, session in list(_sessions.items()):
        if session["session_id"] == session_id:
            session["status"] = "expired"
            del _sessions[code]
            return {"destroyed": True}
    raise HTTPException(status_code=404, detail="Session not found")
