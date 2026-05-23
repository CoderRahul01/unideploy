import logging
import json
from typing import Dict, Any
from core.redis_client import redis

logger = logging.getLogger("unideploy.memory_agent")

async def memory_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Memory Agent: Saves the final LangGraph state to Redis for the dashboard.
    """
    logger.info("Memory Agent starting...")
    session_id = state.get("session_id")
    
    if not session_id:
        return {"current_agent": "memory_agent", "completed": True}
        
    try:
        # Save state context to redis for persistence
        key = f"pipeline_state:{session_id}"
        await redis.json_set(key, {
            "messages": state.get("messages", []),
            "remediation_plans": state.get("remediation_plans", [])
        }, ex=3600)
        
        return {
            "current_agent": "memory_agent", 
            "completed": True
        }
    except Exception as e:
        logger.error(f"Memory agent failed: {e}")
        return {"current_agent": "memory_agent", "completed": True, "error": str(e)}
