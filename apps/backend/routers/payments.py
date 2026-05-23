from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import os
from urllib.parse import urlencode
from core.redis_client import redis
from core.database import db_select

router = APIRouter(prefix="/payments", tags=["payments"])

DODO_CHECKOUT_BASE = "https://checkout.dodopayments.com/buy"

class CheckoutRequest(BaseModel):
    tier: str
    billing: str = "monthly"  # "monthly" or "annual"

TIER_CONFIG = {
    "Builder":    {"monthly_scans": 50,   "annual_scans": 600},
    "Pro":        {"monthly_scans": 200,  "annual_scans": 2400},
    "Enterprise": {"monthly_scans": 1000, "annual_scans": 12000},
}

# Payment link IDs from DODO dashboard — set as env vars in Render:
#   DODO_CHECKOUT_BUILDER_MONTHLY, DODO_CHECKOUT_BUILDER_ANNUAL
#   DODO_CHECKOUT_PRO_MONTHLY,     DODO_CHECKOUT_PRO_ANNUAL
#   DODO_CHECKOUT_ENTERPRISE_MONTHLY, DODO_CHECKOUT_ENTERPRISE_ANNUAL
def _payment_link_id(tier: str, billing: str) -> str | None:
    key = f"DODO_CHECKOUT_{tier.upper()}_{billing.upper()}"
    return os.getenv(key)


@router.post("/checkout")
async def create_checkout(req: CheckoutRequest, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    session_data = await redis.json_get(f"session:{token}")
    if not session_data or "user_id" not in session_data:
        raise HTTPException(status_code=401, detail="Session expired")

    user_id = session_data["user_id"]
    users = await db_select("app_users", {"id": user_id})
    if not users:
        raise HTTPException(status_code=404, detail="User not found")

    user = users[0]

    if req.tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid tier")

    billing = req.billing if req.billing in ("monthly", "annual") else "monthly"
    scans = TIER_CONFIG[req.tier][f"{billing}_scans"]

    link_id = _payment_link_id(req.tier, billing)
    if not link_id:
        raise HTTPException(
            status_code=500,
            detail=f"Checkout not configured: set DODO_CHECKOUT_{req.tier.upper()}_{billing.upper()} in environment"
        )

    frontend_url = os.getenv("FRONTEND_URL", "https://www.unideploy.in")

    params = urlencode({
        "quantity": 1,
        "redirect_url": f"{frontend_url}/dashboard?payment=success",
        "metadata[user_id]": user_id,
        "metadata[tier]": req.tier,
        "metadata[billing]": billing,
        "metadata[scans]": str(scans),
        "prefilled_email": user["email"],
    })

    checkout_url = f"{DODO_CHECKOUT_BASE}/{link_id}?{params}"
    return {"checkout_url": checkout_url}
