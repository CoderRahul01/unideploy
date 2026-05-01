"""
InsForge auth client.
JWT-based auth with OAuth support (Google, GitHub).
No Clerk. No Supabase. No custom auth setup.
"""
import os
import httpx
from fastapi import Header, HTTPException
from typing import Optional

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL", "https://api.insforge.dev")
INSFORGE_PROJECT_ID = os.getenv("INSFORGE_PROJECT_ID", "")
INSFORGE_API_KEY = os.getenv("INSFORGE_API_KEY", "")

HEADERS = {
    "Authorization": f"Bearer {INSFORGE_API_KEY}",
    "X-Project-ID": INSFORGE_PROJECT_ID,
}

async def verify_user_token(token: str) -> dict:
    """Verify a user JWT issued by InsForge auth."""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{INSFORGE_BASE_URL}/auth/verify",
            json={"token": token},
            headers=HEADERS
        )
        if res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        return res.json()  # returns { user_id, email, ... }

async def get_current_user(
    authorization: Optional[str] = Header(default=None)
) -> dict | None:
    """
    FastAPI dependency for optional auth.
    Returns user dict if valid token, None if anonymous.
    Use as: user = Depends(get_current_user)
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    try:
        return await verify_user_token(token)
    except HTTPException:
        return None

async def require_user(
    authorization: Optional[str] = Header(default=None)
) -> dict:
    """
    FastAPI dependency for required auth.
    Use as: user = Depends(require_user)
    """
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
