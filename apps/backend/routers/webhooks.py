from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from payments.dodo_client import DodoClient

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/webhook")
async def dodo_webhook(request: Request, db: Session = Depends(get_db)):
    payload_bytes = await request.body()
    signature = request.headers.get("dodo-signature") or request.headers.get(
        "x-dodo-signature", ""
    )
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    client = DodoClient()
    handled = await client.handle_webhook(payload, signature, payload_bytes, db)
    if not handled:
        raise HTTPException(status_code=400, detail="Webhook signature verification failed")

    return {"status": "ok"}
