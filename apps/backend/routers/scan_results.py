"""
Scan results router — CLI posts local findings here after scanning.
POST /scans/{session_id}/results → persist to InsForge, forward to Orchestrator, emit scan_complete
GET  /scans/{session_id}/report  → return full report for dashboard
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import asyncio
import logging

from core.database import db_insert, db_update, db_select
from routers.sessions import _sessions
from agents.analyzer import compute_grade

logger = logging.getLogger("unideploy.scan_results")

router = APIRouter(prefix="/scans", tags=["scan-results"])


class FindingItem(BaseModel):
    id: str
    file_path: str
    line_number: Optional[int] = None
    severity: str
    category: str
    title: str
    description: str
    fix_guideline: str
    evidence: str
    auto_fixable: bool


class ScanResultsRequest(BaseModel):
    session_id: str
    project_name: str
    framework: str
    scanned_at: str
    files_scanned: int
    total_issues: int
    auto_fixable: int
    grade: str
    findings: list[FindingItem]


def _find_session(session_id: str) -> Optional[dict]:
    for code, s in _sessions.items():
        if s["session_id"] == session_id:
            return s
    return None


async def _forward_to_orchestrator(session_id: str, payload: dict):
    """Forward findings to Vertex AI Orchestrator agent for deep analysis."""
    import os, json

    resource = os.getenv("AGENT_ENGINE_RESOURCE_NAME", "")
    if not resource:
        logger.info("No AGENT_ENGINE_RESOURCE_NAME set — skipping agent enrichment")
        return

    try:
        import vertexai
        from vertexai.preview import reasoning_engines

        gcp_project = os.getenv("GOOGLE_CLOUD_PROJECT", "")
        gcp_location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        vertexai.init(project=gcp_project, location=gcp_location)

        prompt = json.dumps({
            "task": "deep_analysis",
            "session_id": session_id,
            "framework": payload.get("framework"),
            "findings": payload.get("findings", []),
        })

        def _query():
            app = reasoning_engines.ReasoningEngine(resource)
            return app.query(input=prompt)

        await asyncio.to_thread(_query)
        logger.info(f"Orchestrator enrichment complete for session {session_id}")
    except Exception as e:
        logger.warning(f"Orchestrator forwarding failed (non-fatal): {e}")


@router.post("/{session_id}/results", status_code=202)
async def post_scan_results(session_id: str, req: ScanResultsRequest):
    """
    Called by CLI after completing local scan.
    1. Persists scan + findings to InsForge
    2. Stores report in session memory
    3. Emits scan_complete to browser WebSocket
    4. Kicks off async agent enrichment
    """
    if req.session_id != session_id:
        raise HTTPException(400, "session_id mismatch in body vs URL")

    session = _find_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    findings_dicts = [f.model_dump() for f in req.findings]
    grade = req.grade or compute_grade(findings_dicts)

    report = {
        "session_id": session_id,
        "project_name": req.project_name,
        "framework": req.framework,
        "scanned_at": req.scanned_at,
        "files_scanned": req.files_scanned,
        "total_issues": req.total_issues,
        "auto_fixable": req.auto_fixable,
        "grade": grade,
        "findings": findings_dicts,
    }

    session["report"] = report
    session["findings"] = findings_dicts
    session["security_grade"] = grade
    session["status"] = "complete"

    # Persist scan record to InsForge
    try:
        await db_update("scans", session_id, {
            "project_name": req.project_name,
            "framework": req.framework,
            "status": "complete",
            "grade": grade,
            "total_issues": req.total_issues,
            "auto_fixable": req.auto_fixable,
            "files_scanned": req.files_scanned,
            "completed_at": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass

    # Persist individual findings to InsForge
    for finding in findings_dicts:
        try:
            await db_insert("findings", {
                "id": finding["id"],
                "scan_id": session_id,
                "file_path": finding.get("file_path", ""),
                "line_number": finding.get("line_number"),
                "severity": finding.get("severity", ""),
                "category": finding.get("category", ""),
                "title": finding.get("title", ""),
                "description": finding.get("description", ""),
                "fix_guideline": finding.get("fix_guideline", ""),
                "evidence": finding.get("evidence", ""),
                "auto_fixable": finding.get("auto_fixable", False),
                "created_at": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass

    # Emit scan_complete to browser WebSocket
    critical = sum(1 for f in findings_dicts if f.get("severity", "").upper() == "CRITICAL")
    high = sum(1 for f in findings_dicts if f.get("severity", "").upper() == "HIGH")
    medium = sum(1 for f in findings_dicts if f.get("severity", "").upper() == "MEDIUM")

    complete_msg = {
        "type": "scan_complete",
        "session_id": session_id,
        "grade": grade,
        "total_issues": req.total_issues,
        "auto_fixable": req.auto_fixable,
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": req.total_issues - critical - high - medium,
        "report_url": f"/dashboard?session_id={session_id}",
    }

    browser_ws = session.get("browser_ws")
    if browser_ws:
        try:
            await browser_ws.send_json(complete_msg)
        except Exception:
            pass

    cli_ws = session.get("cli_ws")
    if cli_ws:
        try:
            await cli_ws.send_json(complete_msg)
        except Exception:
            pass

    # Kick off agent enrichment in background (non-blocking)
    asyncio.create_task(_forward_to_orchestrator(session_id, report))

    return {"accepted": True, "session_id": session_id, "grade": grade}


@router.get("/{session_id}/report")
async def get_scan_report(session_id: str):
    """
    Called by dashboard to render the full report.
    Returns from in-memory session first, falls back to InsForge.
    """
    session = _find_session(session_id)
    if session and session.get("report"):
        return session["report"]

    # Fallback: try InsForge
    try:
        scans = await db_select("scans", {"session_id": session_id})
        if scans:
            scan = scans[0]
            findings = await db_select("findings", {"scan_id": session_id})
            return {
                "session_id": session_id,
                "project_name": scan.get("project_name", ""),
                "framework": scan.get("framework", ""),
                "scanned_at": scan.get("created_at", ""),
                "files_scanned": scan.get("files_scanned", 0),
                "total_issues": scan.get("total_issues", 0),
                "auto_fixable": scan.get("auto_fixable", 0),
                "grade": scan.get("grade", "?"),
                "findings": findings or [],
            }
    except Exception:
        pass

    raise HTTPException(404, "Report not found")
