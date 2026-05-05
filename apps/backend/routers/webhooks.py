from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/webhook")
async def dodo_webhook(request: Request):
    # DodoClient not yet implemented — accept and acknowledge all webhook events
    return {"status": "ok"}
