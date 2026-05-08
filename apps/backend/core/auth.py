"""
Backend auth — Clerk JWT verification.

Flow:
  1. Frontend (Clerk SDK) signs user in, receives a signed RS256 JWT.
  2. Frontend sends: Authorization: Bearer <jwt> on every API request.
  3. This module verifies the JWT signature using Clerk's public JWKS,
     checks expiry, and returns the user payload.
  4. CLERK_SECRET_KEY never leaves the backend.
  5. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in the frontend is intentionally
     public — it only initialises the Clerk browser SDK, it has no privilege.
"""
import os
import logging
from functools import lru_cache
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException

logger = logging.getLogger("unideploy.auth")

# Set CLERK_JWKS_URL in backend .env.
# Find it in Clerk Dashboard → API Keys → Advanced → JWKS URL.
# Format: https://<your-clerk-frontend-api>/.well-known/jwks.json
_JWKS_URL = os.getenv(
    "CLERK_JWKS_URL",
    "https://api.clerk.dev/v1/jwks",  # fallback; replace with instance URL
)


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    """Singleton JWKS client — caches Clerk's public keys in memory."""
    return PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=3600)


def _verify_clerk_jwt(token: str) -> dict:
    """
    Verify a Clerk-issued JWT and return the payload.
    Raises HTTPException(401) on any failure.
    """
    try:
        client = _jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk omits `aud` on session tokens
        )
        return {
            "user_id": payload["sub"],
            "email": payload.get("email", ""),
            "plan_tier": payload.get("public_metadata", {}).get("plan_tier", "free"),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid Clerk JWT: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error("JWT verification error: %s", e)
        raise HTTPException(status_code=401, detail="Authentication error")


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[dict]:
    """
    FastAPI dependency — optional auth.
    Returns user dict if valid Clerk JWT present, None if anonymous.
    Usage: user = Depends(get_current_user)
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return _verify_clerk_jwt(token)
    except HTTPException:
        return None


async def require_user(
    authorization: Optional[str] = Header(default=None),
) -> dict:
    """
    FastAPI dependency — required auth.
    Raises 401 if no valid Clerk JWT.
    Usage: user = Depends(require_user)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.removeprefix("Bearer ").strip()
    return _verify_clerk_jwt(token)
