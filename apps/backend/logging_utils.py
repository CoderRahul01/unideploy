import json
import logging
import datetime

# Configure standard logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("unideploy.intent")


def log_intent(
    project_id: int,
    user_id: int,
    intent: str,
    result: str,
    reason: str = None,
    meta: dict = None,
):
    """
    Logs an 'intent' - a decision made by the system.
    """
    entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "project_id": project_id,
        "user_id": user_id,
        "intent": intent,
        "result": result,
        "reason": reason,
        "metadata": meta or {},
    }
    logger.info(f"INTENT_LOG: {json.dumps(entry)}")
