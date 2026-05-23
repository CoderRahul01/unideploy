import logging
from typing import Dict, Any

logger = logging.getLogger("unideploy.coding_agent")

async def coding_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Coding Agent: Prepares the patch generation environment.
    (Actual patch generation is deferred until the CLI requests it with local file content).
    """
    logger.info("Coding Agent starting...")
    plans = state.get("remediation_plans", [])
    
    if not plans:
        return {"current_agent": "coding_agent"}
        
    messages = state.get("messages", [])
    messages.append({
        "role": "coder",
        "content": f"Prepared {len(plans)} remediation plans for the CLI to apply."
    })
    
    return {
        "current_agent": "coding_agent",
        "messages": messages
    }
