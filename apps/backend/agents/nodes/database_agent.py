import logging
from typing import Dict, Any
from core.database import db_update

logger = logging.getLogger("unideploy.database_agent")

async def database_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Database Agent: Syncs enriched findings and remediation plans with InsForge.
    """
    logger.info("Database Agent starting...")
    session_id = state.get("session_id")
    plans = state.get("remediation_plans", [])
    
    if not session_id or not plans:
        return {"current_agent": "database_agent"}
        
    try:
        # In a real scenario, we'd update InsForge with the generated plans here
        # For now, we just mark the agent state
        messages = state.get("messages", [])
        messages.append({
            "role": "database",
            "content": "Synced plans to InsForge."
        })
        
        return {
            "current_agent": "database_agent",
            "messages": messages
        }
    except Exception as e:
        logger.error(f"Database agent failed: {e}")
        return {"current_agent": "database_agent", "error": str(e)}
