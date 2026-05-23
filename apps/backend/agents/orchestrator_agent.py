"""
OrchestratorAgent — routes tasks to specialist agents via LangGraph.
"""

import asyncio
import logging
from typing import Optional

from agents.deploy_agent import DeployAgent
from agents.graph import build_graph

logger = logging.getLogger("unideploy.orchestrator")


class OrchestratorAgent:
    """
    Orchestrates scan → fix → deploy pipelines via LangGraph.
    """

    def __init__(self):
        self._deploy_agent = DeployAgent()
        self.graph = build_graph()

    async def run_pipeline(self, session_id: str, options: dict) -> None:
        """
        Full scan → fix → deploy pipeline using LangGraph.
        Progress is streamed to CLI + browser via their session WebSockets.
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

        await emit({"type": "pipeline_progress", "phase": "scan", "message": "Starting multi-agent pipeline..."})

        # Initialize Graph State
        manifest = session.get("project_manifest", {})
        findings = options.get("findings", [])
        
        initial_state = {
            "session_id": session_id,
            "manifest": manifest,
            "findings": findings,
            "remediation_plans": [],
            "messages": [],
            "current_agent": "research_agent",
            "error": None,
            "completed": False
        }

        try:
            # Stream events from LangGraph
            async for output in self.graph.astream(initial_state):
                for node_name, state_update in output.items():
                    await emit({
                        "type": "pipeline_progress", 
                        "phase": "agent_action", 
                        "message": f"Agent {node_name} finished."
                    })
            
            await emit({"type": "pipeline_complete", "message": "All agents finished."})
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            await emit({"type": "error", "message": f"Pipeline failed: {e}"})

    async def handle_deploy(self, session_id: str, payload: dict) -> dict:
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

