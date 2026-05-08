from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio, json
from datetime import datetime

router = APIRouter(tags=["websockets"])

from .sessions import _sessions
from core.database import db_update
from agents.analyzer import run_analysis, compute_grade


async def run_agent_pipeline(session_code: str, project_manifest: dict):
    session = _sessions.get(session_code)
    if not session:
        return

    try:
        findings = await run_analysis(project_manifest)

        for finding in findings:
            session["findings"].append(finding)
            msg = {"type": "finding", "finding": finding}
            if session.get("cli_ws"):
                await session["cli_ws"].send_json(msg)
            if session.get("browser_ws"):
                await session["browser_ws"].send_json(msg)
            await asyncio.sleep(0.2)

        grade = compute_grade(findings)
        session["security_grade"] = grade
        session["status"] = "complete"

        critical = sum(1 for f in findings if f.get("severity", "").upper() == "CRITICAL")
        high = sum(1 for f in findings if f.get("severity", "").upper() == "HIGH")
        medium = sum(1 for f in findings if f.get("severity", "").upper() == "MEDIUM")
        auto_fixable = sum(1 for f in findings if f.get("auto_fixable"))

        summary = {
            "grade": grade,
            "total": len(findings),
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": len(findings) - critical - high - medium,
            "auto_fixable": auto_fixable,
        }
        complete_msg = {"type": "scan_complete", "summary": summary}
        if session.get("cli_ws"):
            await session["cli_ws"].send_json(complete_msg)
        if session.get("browser_ws"):
            await session["browser_ws"].send_json(complete_msg)

        try:
            await db_update("scans", session["session_id"], {
                "status": "complete",
                "grade": grade,
                "total_issues": len(findings),
                "auto_fixable": auto_fixable,
                "completed_at": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass

    except Exception as e:
        error_msg = {"type": "error", "message": f"Scan failed: {str(e)}"}
        if session.get("cli_ws"):
            await session["cli_ws"].send_json(error_msg)
        if session.get("browser_ws"):
            await session["browser_ws"].send_json(error_msg)

@router.websocket("/ws/session/{session_id}")
async def session_websocket(websocket: WebSocket, session_id: str):
    """
    New CLI-first endpoint. CLI connects here by session_id immediately after
    POST /auth/session. Waits for session_authenticated event, then relays
    scan_progress from CLI to browser WebSocket.
    """
    session = None
    session_code = None
    for code, s in _sessions.items():
        if s["session_id"] == session_id:
            session = s
            session_code = code
            break

    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    await websocket.accept()
    session["cli_ws"] = websocket
    session["status"] = "cli_connected"

    # Drain queued messages (browser may have verified before CLI connected)
    for queued_msg in session.get("message_queue", []):
        try:
            await websocket.send_json(queued_msg)
        except Exception:
            pass
    session["message_queue"] = []

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "scan_progress":
                # Relay real-time progress to browser
                browser_ws = session.get("browser_ws")
                if browser_ws:
                    try:
                        await browser_ws.send_json(data)
                    except Exception:
                        pass

            elif msg_type in ("fix_applied", "rescan_done", "pipeline_progress", "deploy_configs_ready"):
                # Relay agent progress messages to browser
                browser_ws = session.get("browser_ws")
                if browser_ws:
                    try:
                        await browser_ws.send_json(data)
                    except Exception:
                        pass

    except WebSocketDisconnect:
        session["cli_ws"] = None
        if session["status"] not in ("complete", "expired"):
            session["status"] = "pending"


@router.websocket("/ws/cli/{session_code}")
async def cli_websocket(websocket: WebSocket, session_code: str):
    """
    CLI connects here after creating a session.
    Receives: project manifest, streams findings
    Sends: browser_connected signal, apply_fix commands
    """
    code = session_code.upper()
    session = _sessions.get(code)
    
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return
    
    await websocket.accept()
    session["cli_ws"] = websocket
    session["status"] = "cli_connected"
    session["cli_connected_at"] = datetime.utcnow()
    
    # Drain queued messages (browser may have connected before CLI)
    for queued_msg in session.get("message_queue", []):
        await websocket.send_json(queued_msg)
    session["message_queue"] = []
    
    # Notify CLI if browser already connected
    if session.get("browser_ws"):
        await websocket.send_json({
            "type": "browser_connected",
            "session_id": session["session_id"]
        })
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "cli_ready":
                # CLI sent project manifest — trigger scan pipeline
                session["project_manifest"] = data.get("project_manifest", {})
                session["machine_name"] = data.get("machine_name", "Unknown")
                session["status"] = "scanning"
                
                # Notify browser that CLI is ready
                if session.get("browser_ws"):
                    await session["browser_ws"].send_json({
                        "type": "cli_ready",
                        "machine_name": session["machine_name"],
                        "project_manifest": session["project_manifest"]
                    })
                
                asyncio.create_task(run_agent_pipeline(code, session["project_manifest"]))
            
            elif msg_type == "finding":
                # CLI/agent found an issue — relay to browser immediately
                finding = data.get("finding", {})
                session["findings"].append(finding)
                
                if session.get("browser_ws"):
                    await session["browser_ws"].send_json({
                        "type": "finding",
                        "finding": finding
                    })
            
            elif msg_type == "scan_complete":
                session["status"] = "complete"
                session["completed_at"] = datetime.utcnow()
                session["security_grade"] = data.get("summary", {}).get("grade")
                
                if session.get("browser_ws"):
                    await session["browser_ws"].send_json({
                        "type": "scan_complete",
                        "summary": data.get("summary", {})
                    })

                await db_update("scans", session["session_id"], {
                    "status": "complete",
                    "grade": data.get("summary", {}).get("grade"),
                    "completed_at": datetime.utcnow().isoformat(),
                })
            
            elif msg_type in ("fix_applied", "rescan_done", "pipeline_progress", "deploy_configs_ready"):
                # CLI agent progress — relay to browser
                if session.get("browser_ws"):
                    await session["browser_ws"].send_json(data)
    
    except WebSocketDisconnect:
        session["cli_ws"] = None
        if session["status"] not in ("complete", "expired"):
            session["status"] = "pending"


@router.websocket("/ws/browser/{session_id}")
async def browser_websocket(websocket: WebSocket, session_id: str):
    """
    Browser connects here after entering the session code.
    Receives: real-time findings, scan_complete
    Sends: apply_fix commands
    """
    # Find session by session_id
    session = None
    session_code = None
    for code, s in _sessions.items():
        if s["session_id"] == session_id:
            session = s
            session_code = code
            break
    
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return
    
    await websocket.accept()
    session["browser_ws"] = websocket
    
    # Notify CLI that browser has connected
    cli_ws = session.get("cli_ws")
    if cli_ws:
        await cli_ws.send_json({
            "type": "browser_connected",
            "session_id": session_id
        })
    else:
        # Queue the message for when CLI connects
        session["message_queue"].append({
            "type": "browser_connected",
            "session_id": session_id
        })
    
    # Send existing findings (browser may have connected mid-scan)
    for finding in session.get("findings", []):
        await websocket.send_json({"type": "finding", "finding": finding})
    
    if session["status"] == "complete":
        await websocket.send_json({
            "type": "scan_complete",
            "summary": {
                "grade": session.get("security_grade"),
                "total_findings": len(session.get("findings", [])),
                "findings": session.get("findings", [])
            }
        })
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "apply_fix":
                cli_ws = session.get("cli_ws")
                if not cli_ws:
                    await websocket.send_json({
                        "type": "error",
                        "message": "CLI is no longer connected. Run 'unideploy init' again in your terminal.",
                    })
                    continue

                # Resolve full finding objects from session by ID
                finding_ids: list[str] = data.get("finding_ids") or (
                    [data["finding_id"]] if data.get("finding_id") else []
                )
                session_findings: list[dict] = session.get("findings", [])
                ids_lower = {fid.lower() for fid in finding_ids}
                findings_to_fix = [
                    f for f in session_findings
                    if f.get("id", "").lower() in ids_lower
                ]

                if not findings_to_fix:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No matching findings in this session. The session may have expired.",
                    })
                    continue

                # Acknowledge to browser immediately
                await websocket.send_json({
                    "type": "fix_started",
                    "finding_ids": finding_ids,
                    "count": len(findings_to_fix),
                })

                # Send enriched apply_fix to CLI with full finding objects
                await cli_ws.send_json({
                    "type": "apply_fix",
                    "findings": findings_to_fix,
                    "session_id": session.get("session_id"),
                })
    
    except WebSocketDisconnect:
        session["browser_ws"] = None
