"""
UniDeploy API — Production-readiness scanner for vibe-coded apps.
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from contextlib import asynccontextmanager
from datetime import datetime
import asyncio
import os, logging

from dotenv import load_dotenv
load_dotenv()

import sentry_sdk

from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        default_integrations=False
    )

from core.posthog import posthog_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("unideploy")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"UniDeploy API starting — env={os.getenv('APP_ENV', 'development')}")
    logger.info(f"Gemini project: {os.getenv('GOOGLE_CLOUD_PROJECT', 'not set')}")
    logger.info(f"E2B configured: {bool(os.getenv('E2B_API_KEY'))}")
    logger.info(f"Tinyfish configured: {bool(os.getenv('TINYFISH_API_KEY'))}")

    # Start background scan worker
    from workers.scan_worker import worker_loop
    worker_task = asyncio.create_task(worker_loop())

    # Start A2A agent message bus
    from agents.orchestrator_agent import setup_a2a_agents
    a2a_tasks = await setup_a2a_agents()

    yield

    for t in a2a_tasks:
        t.cancel()
    worker_task.cancel()
    try:
        await asyncio.gather(worker_task, *a2a_tasks, return_exceptions=True)
    except asyncio.CancelledError:
        pass
    logger.info("UniDeploy API shutting down")
    
    import sentry_sdk
    sentry_sdk.flush()
    if posthog_client:
        posthog_client.flush()


app = FastAPI(
    title="UniDeploy API",
    version="0.1.0",
    description="Production-readiness scanner for vibe-coded apps",
    docs_url="/docs" if os.getenv("APP_ENV") != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── Rate limiting ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Api-Key"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

from routers import sessions, websockets, scans, auth, scan_results, ai, deploy, metrics

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(websockets.router)
app.include_router(scans.router)
app.include_router(scan_results.router)
# webhooks router deleted
app.include_router(ai.router)
app.include_router(deploy.router)
app.include_router(metrics.router)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "0.1.0",
        "env": os.getenv("APP_ENV", "development"),
        "insforge": "configured" if os.getenv("INSFORGE_PROJECT_ID") else "missing",
        "gemini": "configured" if (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_CLOUD_PROJECT")) else "missing",
    }


@app.get("/")
async def root():
    return {"service": "UniDeploy API", "docs": "/docs", "health": "/health"}
