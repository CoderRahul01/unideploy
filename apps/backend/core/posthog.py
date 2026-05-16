"""
Shared PostHog client — initialised once and imported across all routers/workers.
"""

import os
from posthog import Posthog

posthog_client: Posthog | None = None

_api_key = os.getenv("POSTHOG_API_KEY")
if _api_key:
    _kwargs = {"enable_exception_autocapture": True}
    _host = os.getenv("POSTHOG_HOST")
    if _host:
        _kwargs["host"] = _host
    posthog_client = Posthog(_api_key, **_kwargs)
