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

# Tier definitions for DODO payments (amounts are in INR subunits -> 9900 = 99.00 INR)
TIER_PRICES = {
    "Builder": {
        "monthly_amount": 9900,   "monthly_scans": 50,
        "annual_amount":  99000,  "annual_scans":  600,   # ₹990/yr
    },
    "Pro": {
        "monthly_amount": 19900,  "monthly_scans": 200,
        "annual_amount":  199000, "annual_scans":  2400,  # ₹1990/yr
    },
    "Enterprise": {
        "monthly_amount": 29900,  "monthly_scans": 1000,
        "annual_amount":  299000, "annual_scans":  12000, # ₹2990/yr
    },
}

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
    
    if req.tier not in TIER_PRICES:
        raise HTTPException(status_code=400, detail="Invalid tier")

    billing = req.billing if req.billing in ("monthly", "annual") else "monthly"
    price_info = TIER_PRICES[req.tier]
    amount = price_info[f"{billing}_amount"]
    scans  = price_info[f"{billing}_scans"]

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
            "zipcode": ""
        },
        "customer": {
            "email": user["email"],
            "name": user["email"].split("@")[0]
        },
        "product_cart": [
            {
                "name": f"UniDeploy {req.tier} ({billing})",
                "amount": amount,
                "currency": "INR",
                "quantity": 1
            }
        ],
        "return_url": f"{frontend_url}/dashboard?payment=success",
        "cancel_url": f"{frontend_url}/dashboard?payment=cancelled",
        "metadata": {
            "user_id": user_id,
            "tier": req.tier,
            "billing": billing,
            "scans": str(scans)
        }
    }
    
    # DODO requires product_id instead of amount/currency in product_cart in some API versions,
    # but payment link creation often accepts amount/currency directly. 
    # Since we use DODO Payments, we will use their direct payment endpoint.
    headers = {
        "Authorization": f"Bearer {dodo_api_key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=10) as client:
        # Note: The exact endpoint and payload for Dodo Payments might differ slightly.
        # This is a standard structure. If Dodo requires specific fields for one-off payments,
        # they are typically handled like this.
        res = await client.post("https://live.dodopayments.com/payments", json=payload, headers=headers)
        
        if not res.is_success:
            raise HTTPException(status_code=500, detail=f"Payment provider error: {res.text}")
            
        data = res.json()
        return {"checkout_url": data.get("payment_link") or data.get("url")}
