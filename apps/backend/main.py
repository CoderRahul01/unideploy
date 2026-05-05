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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("unideploy")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"UniDeploy API starting — env={os.getenv('APP_ENV', 'development')}")
    logger.info(f"Gemini project: {os.getenv('GOOGLE_CLOUD_PROJECT', 'not set')}")
    logger.info(f"E2B configured: {bool(os.getenv('E2B_API_KEY'))}")

    # Start background scan worker
    from workers.scan_worker import worker_loop
    worker_task = asyncio.create_task(worker_loop())

    yield

    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("UniDeploy API shutting down")


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

from routers import sessions, websockets, scans, webhooks

app.include_router(sessions.router)
app.include_router(websockets.router)
app.include_router(scans.router)
app.include_router(webhooks.router)
# from routers import metrics  # uncomment when metrics endpoint is ready

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


# ── API Key Authentication ────────────────────────────────────────────────────

async def verify_api_key(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    api_key = authorization.replace("Bearer ", "")
    if not api_key or not api_key.startswith("ud_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    return {
        "user_id": "stub_user",
        "plan_tier": "free",
        "scans_remaining": 5,
    }


# ── Scan endpoint (REST fallback — main flow is WebSocket) ────────────────────

@app.post("/api/v1/scan")
@limiter.limit("10/minute")
async def scan_project(
    request: Request,
    payload: dict,
    user=Depends(verify_api_key),
):
    return {
        "scan_id": "scan_stub_001",
        "message": "Use the WebSocket flow: POST /api/v1/sessions/create, then /ws/cli/{code}",
        "websocket_flow": True,
    }


# ── Fix endpoint ──────────────────────────────────────────────────────────────

@app.post("/api/v1/fix")
@limiter.limit("5/minute")
async def fix_findings(
    request: Request,
    payload: dict,
    user=Depends(verify_api_key),
):
    if user["plan_tier"] == "free":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "plan_required",
                "message": "Auto-fix requires Indie plan or higher",
                "upgrade_url": "https://unideploy.in/pricing",
            },
        )
    return {"patches": [], "message": "AutoFixAgent integration in progress"}


# ── Status endpoint ───────────────────────────────────────────────────────────

@app.get("/api/v1/status")
async def get_status(user=Depends(verify_api_key)):
    return {
        "user_id": user["user_id"],
        "plan_tier": user["plan_tier"],
        "scans_remaining": user["scans_remaining"],
        "last_scan": None,
    }
