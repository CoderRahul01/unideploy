import logging
from typing import Dict, Any
from agents.plan_agent import generate_skill_md

logger = logging.getLogger("unideploy.planning_agent")

async def planning_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Planning Agent: Generates a concrete skill.md remediation plan based on the
    research context, and pushes it to the CLI.
    """
    logger.info("Planning Agent starting...")
    session_id = state.get("session_id")
    
    # Get the research context from the last message
    research_context = ""
    for msg in reversed(state.get("messages", [])):
        if msg.get("role") == "researcher":
            research_context = msg.get("content", "")
            break
            
    if not research_context:
        return {"current_agent": "planning_agent", "error": "No research context found"}
        
    try:
        skill_md = await generate_skill_md(research_context, state.get("findings", []))
        
        # Send to CLI
        from routers.sessions import _sessions
        session = None
        for code, s in _sessions.items():
            if s["session_id"] == session_id:
                session = s
                break
                
        if session and session.get("cli_ws"):
            await session["cli_ws"].send_json({
                "type": "skill_md_generated",
                "content": skill_md
            })
        
        return {
            "current_agent": "planning_agent",
            "messages": [{"role": "planner", "content": skill_md}]
        }
    except Exception as e:
        logger.error(f"Planning agent failed: {e}")
        return {"current_agent": "planning_agent", "error": str(e)}
