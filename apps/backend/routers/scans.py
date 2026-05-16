"""
Scan router — GitHub URL-based scan pipeline.
POST /api/v1/scan    → queue scan, return scan_id
GET  /api/v1/scan/{id} → poll status + findings
GET  /api/v1/scan/{id}/plan → get remediation plan
POST /api/v1/scan/{id}/fix  → user-triggered FixAgent → GitHub PR
"""

from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, HttpUrl
from typing import Optional
from uuid import uuid4
from datetime import datetime
import os

from core.database import db_insert
from core.redis_client import redis
from core.posthog import posthog_client

router = APIRouter(prefix="/api/v1/scan", tags=["scans"])


# ── Request / Response models ─────────────────────────────────────────────────

class ScanRequest(BaseModel):
    github_url: str
    branch: str = "main"


class FixRequest(BaseModel):
    finding_ids: Optional[list[str]] = None  # None = fix all auto_fixable


class ScanStatusResponse(BaseModel):
    scan_id: str
    status: str          # queued | running | planning | done | failed
    github_url: str
    branch: str
    framework: Optional[str] = None
    security_grade: Optional[str] = None
    findings_count: int = 0
    findings: list = []
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_scan_or_404(scan_id: str) -> dict:
    scan = await redis.json_get(f"scan:{scan_id}")
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", status_code=202)
async def start_scan(
    req: ScanRequest,
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    """
    Queue a GitHub URL scan. Returns immediately with scan_id.
    Frontend polls GET /api/v1/scan/{scan_id} to track progress.
    """
    from workers.scan_worker import enqueue_scan

    scan_id = str(uuid4())
    now = datetime.utcnow().isoformat()

    scan_record = {
        "scan_id": scan_id,
        "status": "queued",
        "github_url": req.github_url,
        "branch": req.branch,
        "framework": None,
        "security_grade": None,
        "findings": [],
        "remediation_plans": [],
        "error": None,
        "created_at": now,
        "completed_at": None,
    }

    # Persist to InsForge best-effort
    try:
        await db_insert("scans", {"id": scan_id, "github_url": req.github_url,
                                   "branch": req.branch, "status": "queued", "created_at": now})
    except Exception:
        pass

    await enqueue_scan(scan_id, scan_record)

    if posthog_client:
        posthog_client.capture(scan_id, "scan_queued", {
            "branch": req.branch,
        })

    return {"scan_id": scan_id, "status": "queued", "created_at": now}


@router.get("/{scan_id}", response_model=ScanStatusResponse)
async def get_scan_status(scan_id: str):
    """Poll scan status and findings."""
    scan = await _get_scan_or_404(scan_id)
    return ScanStatusResponse(
        scan_id=scan_id,
        status=scan["status"],
        github_url=scan["github_url"],
        branch=scan["branch"],
        framework=scan.get("framework"),
        security_grade=scan.get("security_grade"),
        findings_count=len(scan.get("findings", [])),
        findings=scan.get("findings", []),
        error=scan.get("error"),
        created_at=scan["created_at"],
        completed_at=scan.get("completed_at"),
    )


@router.get("/{scan_id}/plan")
async def get_remediation_plan(scan_id: str):
    """Get the PlanAgent's remediation plan for a completed scan."""
    scan = await _get_scan_or_404(scan_id)
    if scan["status"] not in ("done", "planning"):
        raise HTTPException(
            status_code=409,
            detail=f"Plan not ready yet — scan status is '{scan['status']}'",
        )
    return {
        "scan_id": scan_id,
        "security_grade": scan.get("security_grade"),
        "findings": scan.get("findings", []),
        "remediation_plans": scan.get("remediation_plans", []),
    }


@router.post("/{scan_id}/fix")
async def trigger_fix(
    scan_id: str,
    req: FixRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    User-triggered FixAgent.
    1. Reads findings + plans from scan record
    2. Generates patches in E2B sandbox
    3. Raises GitHub PR via Composio
    Returns PR URL.
    """
    scan = await _get_scan_or_404(scan_id)

    if scan["status"] != "done":
        raise HTTPException(
            status_code=409,
            detail=f"Scan must be complete before fixing (status: {scan['status']})",
        )

    all_findings = scan.get("findings", [])
    plans = scan.get("remediation_plans", [])

    # Filter to requested finding_ids (or all auto_fixable)
    if req.finding_ids:
        target_findings = [f for f in all_findings if f["id"] in req.finding_ids]
    else:
        target_findings = [f for f in all_findings if f.get("auto_fixable")]

    if not target_findings:
        raise HTTPException(status_code=422, detail="No fixable findings selected")

    from agents.e2b_runner import run_scan_in_sandbox, run_fix_in_sandbox
    from agents.fix_agent import generate_patches, raise_github_pr

    github_url = scan["github_url"]
    branch = scan.get("branch", "main")

    # Mark scan as fixing
    scan["status"] = "fixing"
    await redis.json_set(f"scan:{scan_id}", scan, ex=3600)

    if posthog_client:
        posthog_client.capture(scan_id, "scan_fix_triggered", {
            "findings_selected": len(target_findings),
            "specific_ids_requested": bool(req.finding_ids),
        })

    try:
        # Step 1: Get file contents for affected files via a fresh sandbox clone
        affected_files = list({f["file"] for f in target_findings if f.get("file") and f["file"] != "."})

        # Fetch file contents from sandbox
        from agents.e2b_runner import _run_analyze_sync
        import asyncio

        async def _get_file_contents() -> dict[str, str]:
            from e2b import Sandbox
            import asyncio

            def _fetch_sync():
                sbx = Sandbox(api_key=os.getenv("E2B_API_KEY") or None, timeout=120)
                try:
                    sbx.commands.run(f"git clone --depth=1 {github_url} /repo 2>&1", timeout=60)
                    contents = {}
                    for rel_path in affected_files:
                        try:
                            content = sbx.files.read(f"/repo/{rel_path}")
                            contents[rel_path] = content
                        except Exception:
                            pass
                    return contents
                finally:
                    try:
                        sbx.kill()
                    except Exception:
                        pass

            return await asyncio.to_thread(_fetch_sync)

        file_contents = await _get_file_contents()

        # Step 2: Generate patches via FixAgent (Gemini)
        patches = await generate_patches(target_findings, plans, file_contents)

        if not patches:
            scan = await redis.json_get(f"scan:{scan_id}") or scan
            scan["status"] = "done"
            await redis.json_set(f"scan:{scan_id}", scan, ex=3600)
            raise HTTPException(status_code=422, detail="Could not generate any patches — try manual fixes")

        # Step 3: Apply patches in E2B sandbox and push fix branch
        fix_result = await run_fix_in_sandbox(
            github_url=github_url,
            branch=branch,
            patches=patches,
            repo_name=github_url.split("/")[-1].replace(".git", ""),
        )

        if not fix_result.get("success"):
            scan = await redis.json_get(f"scan:{scan_id}") or scan
            scan["status"] = "done"
            await redis.json_set(f"scan:{scan_id}", scan, ex=3600)
            raise HTTPException(status_code=500, detail=fix_result.get("error", "Fix failed"))

        # Step 4: Raise GitHub PR via Composio
        pr_result = await raise_github_pr(
            github_url=github_url,
            fix_branch=fix_result["fix_branch"],
            base_branch=branch,
            findings_count=len(patches),
            scan_id=scan_id,
        )

        scan = await redis.json_get(f"scan:{scan_id}") or scan
        scan["status"] = "done"
        scan["pr_url"] = pr_result.get("pr_url")
        await redis.json_set(f"scan:{scan_id}", scan, ex=3600)

        if posthog_client:
            posthog_client.capture(scan_id, "scan_fix_completed", {
                "patches_applied": len(patches),
                "files_changed": len(fix_result.get("files_changed", [])),
                "pr_raised": bool(pr_result.get("pr_url")),
            })

        return {
            "scan_id": scan_id,
            "pr_url": pr_result.get("pr_url"),
            "pr_number": pr_result.get("pr_number"),
            "files_changed": fix_result.get("files_changed", []),
            "patches_applied": len(patches),
            "error": pr_result.get("error"),
        }

    except HTTPException:
        raise
    except Exception as e:
        scan = await redis.json_get(f"scan:{scan_id}") or scan
        scan["status"] = "done"
        await redis.json_set(f"scan:{scan_id}", scan, ex=3600)
        raise HTTPException(status_code=500, detail=f"Fix pipeline error: {str(e)}")
