"""
OrchestratorAgent — routes tasks to specialist agents via the A2A bus.
Registered at startup; receives tasks from the run_pipeline endpoint and
streams progress back to the CLI and browser WebSocket.
"""

import asyncio
import logging
from typing import Optional

from agents.a2a_bus import A2ABus, A2AMessage, get_bus
from agents.deploy_agent import DeployAgent
from agents.fix_agent import generate_patch_for_cli
from agents.analyzer import run_analysis, compute_grade

logger = logging.getLogger("unideploy.orchestrator")


class OrchestratorAgent:
    """
    Orchestrates scan → fix → deploy pipelines via the A2A bus.
    Agents communicate via JSON-RPC 2.0 messages; the orchestrator
    manages task state per session_id.
    """

    def __init__(self, bus: Optional[A2ABus] = None):
        self.bus = bus or get_bus()
        self._deploy_agent = DeployAgent()
        self._active: dict[str, dict] = {}  # session_id → state

    async def handle_message(self, msg: A2AMessage) -> Optional[dict]:
        """Handler registered with the A2A bus under 'orchestrator'."""
        task = msg.params.get("task")
        payload = msg.params.get("payload", {})
        context_id = msg.params.get("context_id", "")

        logger.info(f"Orchestrator received task='{task}' context={context_id}")

        if task == "run_pipeline":
            asyncio.create_task(self._run_pipeline(context_id, payload))
            return {"accepted": True, "context_id": context_id}

        if task == "generate_configs":
            return await self._handle_deploy(context_id, payload)

        logger.warning(f"Orchestrator: unknown task '{task}'")
        return None

    async def _run_pipeline(self, session_id: str, options: dict) -> None:
        """
        Full scan → fix → deploy pipeline.
        Progress is sent to CLI + browser via their session WebSockets.
        """
        from routers.sessions import _sessions

        session = None
        for code, s in _sessions.items():
            if s["session_id"] == session_id:
                session = s
                break

        if not session:
            logger.warning(f"Orchestrator: session {session_id} not found")
            return

        async def emit(msg: dict):
            for ws_key in ("cli_ws", "browser_ws"):
                ws = session.get(ws_key)
                if ws:
                    try:
                        await ws.send_json(msg)
                    except Exception:
                        pass

        # ── Phase 1: Scan ─────────────────────────────────────────────────────
        if not options.get("skip_scan"):
            await emit({"type": "pipeline_progress", "phase": "scan", "message": "Starting security scan..."})
            manifest = session.get("project_manifest", {})
            try:
                findings = await run_analysis(manifest)
                for f in findings:
                    session.setdefault("findings", []).append(f)
                    await emit({"type": "finding", "finding": f})
                grade = compute_grade(findings)
                session["security_grade"] = grade
                await emit({"type": "scan_complete", "summary": {
                    "grade": grade,
                    "total": len(findings),
                    "critical": sum(1 for f in findings if f.get("severity", "").upper() == "CRITICAL"),
                    "high": sum(1 for f in findings if f.get("severity", "").upper() == "HIGH"),
                    "medium": sum(1 for f in findings if f.get("severity", "").upper() == "MEDIUM"),
                    "low": sum(1 for f in findings if f.get("severity", "").upper() == "LOW"),
                    "auto_fixable": sum(1 for f in findings if f.get("auto_fixable")),
                }})
            except Exception as e:
                await emit({"type": "error", "message": f"Scan phase failed: {e}"})
                return

        # ── Phase 2: Deploy config generation ─────────────────────────────────
        if not options.get("skip_deploy"):
            manifest = session.get("project_manifest", {})
            answers = options.get("deploy_answers", {})
            await emit({"type": "pipeline_progress", "phase": "deploy", "message": "Generating deployment configs..."})
            try:
                stack = self._deploy_agent.detect_stack(manifest)
                configs = await self._deploy_agent.generate_configs(manifest, stack, answers)
                await emit({
                    "type": "deploy_configs_ready",
                    "configs": [{"path": c.path, "content": c.content, "description": c.description} for c in configs],
                })
            except Exception as e:
                await emit({"type": "error", "message": f"Deploy phase failed: {e}"})

    async def _handle_deploy(self, session_id: str, payload: dict) -> dict:
        """Generate deployment configs for a session (called from deploy endpoint)."""
        manifest = payload.get("manifest", {})
        answers = payload.get("answers", {})
        stack = self._deploy_agent.detect_stack(manifest)
        configs = await self._deploy_agent.generate_configs(manifest, stack, answers)
        return {
            "configs": [
                {"path": c.path, "content": c.content, "description": c.description}
                for c in configs
            ]
        }


_orchestrator: Optional[OrchestratorAgent] = None


def get_orchestrator() -> OrchestratorAgent:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = OrchestratorAgent()
    return _orchestrator


async def setup_a2a_agents() -> list[asyncio.Task]:
    """
    Register all agents with the A2A bus and start their consumer loops.
    Call this once from FastAPI lifespan.
    """
    bus = get_bus()
    orchestrator = get_orchestrator()

    bus.register("orchestrator", orchestrator.handle_message)

    tasks = [
        asyncio.create_task(bus.run_agent("orchestrator"), name="a2a-orchestrator"),
    ]

    logger.info("A2A agents registered: orchestrator")
    return tasks
