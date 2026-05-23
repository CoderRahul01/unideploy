from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import os
import httpx
from core.redis_client import redis
from core.database import db_select

router = APIRouter(prefix="/payments", tags=["payments"])

class CheckoutRequest(BaseModel):
    tier: str
    billing: str = "monthly"  # "monthly" or "annual"

# Scan grants per tier/billing (amounts live in DODO product definitions)
TIER_CONFIG = {
    "Builder":    {"monthly_scans": 50,   "annual_scans": 600},
    "Pro":        {"monthly_scans": 200,  "annual_scans": 2400},
    "Enterprise": {"monthly_scans": 1000, "annual_scans": 12000},
}

# Product IDs from DODO dashboard — set as env vars in Render:
#   DODO_PRODUCT_BUILDER_MONTHLY, DODO_PRODUCT_BUILDER_ANNUAL
#   DODO_PRODUCT_PRO_MONTHLY,     DODO_PRODUCT_PRO_ANNUAL
#   DODO_PRODUCT_ENTERPRISE_MONTHLY, DODO_PRODUCT_ENTERPRISE_ANNUAL
def _product_id(tier: str, billing: str) -> str | None:
    key = f"DODO_PRODUCT_{tier.upper()}_{billing.upper()}"
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

    product_id = _product_id(req.tier, billing)
    if not product_id:
        raise HTTPException(
            status_code=500,
            detail=f"Product not configured: set DODO_PRODUCT_{req.tier.upper()}_{billing.upper()} in environment"
        )

    dodo_api_key = os.getenv("DODO_API_KEY")
    if not dodo_api_key:
        raise HTTPException(status_code=500, detail="DODO payments not configured")

    frontend_url = os.getenv("FRONTEND_URL", "https://www.unideploy.in")

    payload = {
        "billing": {
            "city": "",
            "country": "IN",
            "state": "",
            "street": "",
            "zipcode": "",
        },
        "customer": {
            "email": user["email"],
            "name": user["email"].split("@")[0],
        },
        "product_cart": [
            {"product_id": product_id, "quantity": 1}
        ],
        "return_url": f"{frontend_url}/dashboard?payment=success",
        "cancel_url": f"{frontend_url}/dashboard?payment=cancelled",
        "metadata": {
            "user_id": user_id,
            "tier": req.tier,
            "billing": billing,
            "scans": str(scans),
        },
    }

    headers = {
        "Authorization": f"Bearer {dodo_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post("https://live.dodopayments.com/payments", json=payload, headers=headers)
        if not res.is_success:
            raise HTTPException(status_code=500, detail=f"Payment provider error: {res.text}")

        data = res.json()
        checkout_url = data.get("payment_link") or data.get("url") or data.get("checkout_url")
        if not checkout_url:
            raise HTTPException(status_code=500, detail=f"No checkout URL in DODO response: {data}")
        return {"checkout_url": checkout_url}
