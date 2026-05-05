"""
Background scan worker — processes scan_queue 10 at a time.
Prevents Gemini rate limit exhaustion under concurrent load.
"""

import asyncio
import logging
from datetime import datetime

logger = logging.getLogger("unideploy.worker")

# Shared in-memory scan store (imported by routers/scans.py too)
_scans: dict[str, dict] = {}
_scan_queue: asyncio.Queue = asyncio.Queue()

WORKER_CONCURRENCY = 10  # max simultaneous E2B sandboxes


async def enqueue_scan(scan_id: str, scan_record: dict) -> None:
    """Called by the scan router to add a job to the queue."""
    _scans[scan_id] = scan_record
    await _scan_queue.put(scan_id)
    logger.info(f"Scan queued: {scan_id} — queue depth: {_scan_queue.qsize()}")


async def _process_scan(scan_id: str) -> None:
    from agents.e2b_runner import run_scan_in_sandbox
    from agents.plan_agent import generate_remediation_plan
    from core.database import db_insert, db_update

    scan = _scans.get(scan_id)
    if not scan:
        return

    scan["status"] = "running"
    scan["started_at"] = datetime.utcnow().isoformat()
    logger.info(f"Processing scan {scan_id}: {scan.get('github_url')}")

    try:
        # ── Step 1: AnalyzeAgent in E2B sandbox ──────────────────────────
        result = await run_scan_in_sandbox(
            github_url=scan["github_url"],
            branch=scan.get("branch", "main"),
        )
        findings = result.get("findings", [])
        framework = result.get("framework", "unknown")
        scan["findings"] = findings
        scan["framework"] = framework

        # ── Step 2: Compute security grade ───────────────────────────────
        from agents.analyzer import compute_grade
        grade = compute_grade(findings)
        scan["security_grade"] = grade

        # ── Step 3: PlanAgent — generate remediation plan ─────────────────
        scan["status"] = "planning"
        plans = await generate_remediation_plan(findings)
        scan["remediation_plans"] = plans

        # ── Step 4: Persist to InsForge ──────────────────────────────────
        try:
            await db_update("scans", scan_id, {
                "status": "done",
                "framework": framework,
                "security_grade": grade,
                "findings": findings,
                "remediation_plans": plans,
                "completed_at": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass  # InsForge best-effort

        scan["status"] = "done"
        scan["completed_at"] = datetime.utcnow().isoformat()
        logger.info(f"Scan {scan_id} complete — {len(findings)} findings, grade={grade}")

    except Exception as e:
        scan["status"] = "failed"
        scan["error"] = str(e)
        logger.error(f"Scan {scan_id} failed: {e}")
        try:
            await db_update("scans", scan_id, {"status": "failed", "error": str(e)})
        except Exception:
            pass


async def worker_loop() -> None:
    """
    Background coroutine — started once in main.py lifespan.
    Processes scans from the queue with max WORKER_CONCURRENCY simultaneous.
    """
    semaphore = asyncio.Semaphore(WORKER_CONCURRENCY)
    logger.info(f"Scan worker started (concurrency={WORKER_CONCURRENCY})")

    async def run_with_semaphore(scan_id: str):
        async with semaphore:
            await _process_scan(scan_id)

    while True:
        try:
            scan_id = await asyncio.wait_for(_scan_queue.get(), timeout=5.0)
            asyncio.create_task(run_with_semaphore(scan_id))
            _scan_queue.task_done()
        except asyncio.TimeoutError:
            continue
        except asyncio.CancelledError:
            logger.info("Scan worker shutting down")
            break
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            await asyncio.sleep(1)
