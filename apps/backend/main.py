"""
UniDeploy API — Production-readiness scanner for vibe-coded apps.

FastAPI backend that orchestrates security scans via Gemini ADK agents,
manages projects, enforces plan quotas (Dodo Payments), and serves results
to the CLI, MCP server, and web dashboard.
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from datetime import datetime
import os

from dotenv import load_dotenv

load_dotenv()

# ── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="UniDeploy API",
    description="Production-readiness scanner for vibe-coded apps",
    version="0.1.0",
)

from routers import sessions, websockets

app.include_router(sessions.router)
app.include_router(websockets.router)

@app.on_event("startup")
async def startup():
    """
    InsForge manages tables via CLI.
    Run: npx @insforge/cli db:push to sync schema.
    Tables needed: users, api_keys, projects, scans, findings, scan_sessions
    """
    print("✓ InsForge backend connected")
    print(f"  Project: {os.getenv('INSFORGE_PROJECT_ID', 'not set')}")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────

raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://unideploy.in,https://www.unideploy.in",
)
origins = [o.strip() for o in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── API Key Authentication ───────────────────────────────────────────────────

async def verify_api_key(authorization: str = Header(None)):
    """
    Verify the API key from the Authorization header.
    Returns user context (user_id, plan_tier) if valid.

    TODO: Look up api_key in Supabase `user_api_keys` table.
    TODO: Check plan quota (scans_used_this_month vs scans_limit).
    TODO: Return 401 if invalid, 402 if quota exceeded.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    api_key = authorization.replace("Bearer ", "")

    if not api_key or not api_key.startswith("ud_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    # TODO: Database lookup + quota check
    # For now, return a stub user context
    return {
        "user_id": "stub_user",
        "plan_tier": "free",
        "scans_remaining": 5,
    }


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    insforge_ok = bool(os.getenv("INSFORGE_PROJECT_ID"))
    return {
        "status": "healthy",
        "insforge": "connected" if insforge_ok else "not configured",
        "project_id": os.getenv("INSFORGE_PROJECT_ID", "not set")
    }


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "UniDeploy API",
        "version": "0.1.0",
        "description": "Production-readiness scanner for vibe-coded apps",
    }


# ── Scan Endpoint ────────────────────────────────────────────────────────────

@app.post("/api/v1/scan")
@limiter.limit("10/minute")
async def scan_project(
    request: Request,
    payload: dict,
    user=Depends(verify_api_key),
):
    """
    Receive a project manifest from the CLI and dispatch a scan.

    Expected payload:
    {
        "project_name": "my-app",
        "framework": "nextjs-14",
        "file_tree": [...],
        "files": { "path": "content", ... },
        "package_json": { ... },
        "git_remote": "https://github.com/user/repo"
    }

    Returns:
    {
        "scan_id": "...",
        "security_grade": "D",
        "findings": [...],
        "auto_fixes_available": 6
    }

    TODO: Dispatch to AnalyzerAgent (Gemini Flash) via ADK.
    TODO: Increment scans_used_this_month after completion.
    TODO: Store results in Supabase.
    """
    project_name = payload.get("project_name", "unknown")
    framework = payload.get("framework", "unknown")

    # Stub response — will be replaced with actual agent call
    return {
        "scan_id": "scan_stub_001",
        "project_name": project_name,
        "framework": framework,
        "security_grade": "D",
        "is_vibe_coded": True,
        "findings": [
            {
                "id": "finding_001",
                "category": "secrets",
                "severity": "CRITICAL",
                "title": "Hardcoded API key detected",
                "file": "src/lib/supabase.ts",
                "line": 12,
                "description": "Supabase anon_key is exposed in client-side bundle",
                "auto_fixable": True,
                "fix_type": "move_to_env",
            }
        ],
        "auto_fixes_available": 1,
        "scan_duration_ms": 0,
        "message": "Stub response — agents not yet connected",
    }


# ── Fix Endpoint ─────────────────────────────────────────────────────────────

@app.post("/api/v1/fix")
@limiter.limit("5/minute")
async def fix_findings(
    request: Request,
    payload: dict,
    user=Depends(verify_api_key),
):
    """
    Generate patches for specified findings.

    Expected payload:
    {
        "scan_id": "...",
        "finding_ids": ["finding_001", "finding_002"],
        "files": { "path": "content", ... }
    }

    Returns:
    {
        "patches": [
            {
                "finding_id": "finding_001",
                "file": "src/lib/supabase.ts",
                "diff": "...",
                "verified": true
            }
        ]
    }

    TODO: Dispatch to AutoFixAgent (Gemini Pro).
    TODO: Verify patches via BuildAgent.
    TODO: Requires paid plan (Indie+).
    """
    if user["plan_tier"] == "free":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "plan_required",
                "message": "Auto-fix requires Indie plan or higher",
                "upgrade_url": "https://unideploy.in/pricing",
            },
        )

    return {
        "patches": [],
        "message": "Stub response — AutoFixAgent not yet connected",
    }


# ── Status Endpoint ──────────────────────────────────────────────────────────

@app.get("/api/v1/status")
async def get_status(user=Depends(verify_api_key)):
    """Returns the user's current plan status and scan usage."""
    return {
        "user_id": user["user_id"],
        "plan_tier": user["plan_tier"],
        "scans_remaining": user["scans_remaining"],
        "last_scan": None,
    }
