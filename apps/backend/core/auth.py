"""
Backend auth — session-based authentication stub.

The CLI session-code flow is the primary auth mechanism:
  1. CLI creates a session → gets a 6-digit code
  2. User enters the code on /connect → session is linked
  3. Dashboard loads via session_id query param

For future: add lightweight auth (magic link, GitHub OAuth)
for persistent features like scan history.
"""
import logging
from typing import Optional

from fastapi import Header, HTTPException

logger = logging.getLogger("unideploy.auth")


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[dict]:
    """
    FastAPI dependency — optional auth.
    Currently returns None (anonymous) for all requests.
    Session-code matching handles authentication.
    Usage: user = Depends(get_current_user)
    """
    # Future: implement magic-link / OAuth token verification here
    return None


async def require_user(
    authorization: Optional[str] = Header(default=None),
) -> dict:
    """
    FastAPI dependency — required auth.
    Raises 401 — placeholder for future auth implementation.
    Usage: user = Depends(require_user)
    """
    raise HTTPException(
        status_code=401,
        detail="Authentication not configured. Use session-code flow.",
    )
