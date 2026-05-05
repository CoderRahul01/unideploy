"""
Auth router — CLI-first session flow.
POST /auth/session → generate 6-digit numeric code + UUID session_id
POST /auth/verify  → browser enters code, emits session_authenticated to CLI WS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from uuid import uuid4
import random
from datetime import datetime, timedelta
import os

from core.database import db_insert, db_update
from routers.sessions import _sessions

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
    expiry = datetime.utcnow() + timedelta(minutes=10)

    _sessions[code] = {
        "session_id": session_id,
        "session_code": code,
        "status": "pending",
        "cli_ws": None,
        "browser_ws": None,
        "message_queue": [],
        "findings": [],
        "report": None,
        "created_at": datetime.utcnow(),
        "expires_at": expiry,
        # legacy compat fields
        "machine_name": None,
        "project_path": "",
        "cli_version": "latest",
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

    session = _sessions.get(code)
    if not session:
        raise HTTPException(status_code=404, detail="Session code not found")

    if datetime.utcnow() > session["expires_at"]:
        raise HTTPException(status_code=410, detail="Session code expired")

    session["status"] = "authenticated"
    session["authenticated_at"] = datetime.utcnow()

    auth_msg = {"type": "session_authenticated", "session_id": session["session_id"]}

    cli_ws = session.get("cli_ws")
    if cli_ws:
        try:
            await cli_ws.send_json(auth_msg)
        except Exception:
            pass
    else:
        session["message_queue"].append(auth_msg)

    try:
        await db_update("scans", session["session_id"], {"status": "authenticated"})
    except Exception:
        pass

    return {
        "session_id": session["session_id"],
        "status": "authenticated",
    }
