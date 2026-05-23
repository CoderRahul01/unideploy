from fastapi import APIRouter, HTTPException, Request
import os
import hmac
import hashlib
from core.database import db_update, db_select

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/dodo")
async def dodo_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("webhook-signature")
    
    webhook_secret = os.getenv("DODO_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
        
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    data = json.loads(payload)
    
    # We care about payment success
    event_type = data.get("type", data.get("event"))
    if event_type in ("payment.succeeded", "payment.success"):
        payment_data = data.get("data", {})
        metadata = payment_data.get("metadata", {})
        
        user_id = metadata.get("user_id")
        tier = metadata.get("tier")
        scans = metadata.get("scans")
        
        if user_id and tier and scans:
            users = await db_select("app_users", {"id": user_id})
            if users:
                await db_update("app_users", user_id, {
                    "plan_tier": tier,
                    "scans_remaining": int(scans),
                })
                
    return {"status": "ok"}
