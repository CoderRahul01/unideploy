"""
UniDeploy Agent Service — Production-readiness reasoning service.
Ported from legacy monolith to a pure LLM reasoning service on port 8001.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from contextlib import asynccontextmanager
import asyncio
import os
import logging
import tempfile
import json
import math
import re
import hashlib

from dotenv import load_dotenv
load_dotenv()

import uvicorn
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
from analyzer.security_checker import run_checks
from agents.fix_agent import generate_patch_for_cli
from agents.deploy_agent import DeployAgent, StackInfo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("unideploy-agent-service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("UniDeploy Agent Service starting — port=8001")
    yield
    logger.info("UniDeploy Agent Service shutting down")
    sentry_sdk.flush()
    if posthog_client:
        posthog_client.flush()

app = FastAPI(
    title="UniDeploy Agent Service",
    version="2.0.0",
    description="LLM reasoning service for UniDeploy",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

deploy_agent = DeployAgent()

# ── Secrets Audit Helper Data & Logic ──────────────────────────────────────────

SECRET_PATTERNS = [
    {"provider": "Anthropic", "pattern": r"sk-ant-[a-zA-Z0-9_\-]{40,}", "severity": "critical"},
    {"provider": "OpenAI", "pattern": r"sk-proj-[a-zA-Z0-9_\-]{40,}", "severity": "critical"},
    {"provider": "OpenAI (legacy)", "pattern": r"sk-[a-zA-Z0-9]{48}", "severity": "critical"},
    {"provider": "Stripe (live)", "pattern": r"sk_live_[a-zA-Z0-9]{24,}", "severity": "critical"},
    {"provider": "Stripe (rkey)", "pattern": r"rk_live_[a-zA-Z0-9]{24,}", "severity": "critical"},
    {"provider": "AWS Access Key", "pattern": r"AKIA[A-Z0-9]{16}", "severity": "critical"},
    {"provider": "GitHub PAT", "pattern": r"ghp_[a-zA-Z0-9]{36}", "severity": "high"},
    {"provider": "GitHub OAuth", "pattern": r"gho_[a-zA-Z0-9]{36}", "severity": "high"},
    {"provider": "GitHub App", "pattern": r"ghs_[a-zA-Z0-9]{36}", "severity": "high"},
    {"provider": "Google API", "pattern": r"AIza[a-zA-Z0-9_\-]{35}", "severity": "high"},
    {"provider": "Slack Bot", "pattern": r"xoxb-[a-zA-Z0-9\-]{50,}", "severity": "high"},
    {"provider": "Slack User", "pattern": r"xoxp-[a-zA-Z0-9\-]{70,}", "severity": "high"},
    {
        "provider": "Supabase svcRole",
        "pattern": r"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]{40,}",
        "severity": "critical",
    },
    {
        "provider": "Private Key PEM",
        "pattern": r"-----BEGIN (RSA |EC )?PRIVATE KEY-----",
        "severity": "critical",
    },
    {"provider": "Stripe (test)", "pattern": r"sk_test_[a-zA-Z0-9]{24,}", "severity": "medium"},
]

IGNORE_FILES = [
    {"file": ".gitignore", "tool": "git"},
    {"file": ".dockerignore", "tool": "Docker"},
    {"file": ".cursorignore", "tool": "Cursor"},
    {"file": ".cursorindexingignore", "tool": "Cursor indexer"},
    {"file": ".claudeignore", "tool": "Claude Code"},
    {"file": ".aiderignore", "tool": "Aider"},
    {"file": ".codeiumignore", "tool": "Codeium/Windsurf"},
    {"file": ".continueignore", "tool": "Continue"},
    {"file": ".clineignore", "tool": "Cline"},
    {"file": ".geminiignore", "tool": "Gemini Code Assist"},
    {"file": ".copilotignore", "tool": "GitHub Copilot"},
]

REQUIRED_PATTERNS = [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "secrets/",
    ".env.local",
    ".env.production",
]

def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    return -sum((f / len(s)) * math.log2(f / len(s)) for f in freq.values())

def mask(value: str) -> str:
    return value[:6] + "****"

def fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]

def run_secrets_audit(files: dict[str, str]) -> dict:
    findings = []
    
    # 1. Ignore coverage check
    for item in IGNORE_FILES:
        filename = item["file"]
        tool = item["tool"]
        
        if filename not in files:
            findings.append({
                "file": filename,
                "type": "ignore_missing",
                "severity": "high",
                "description": f"{filename} is missing. {tool} may index or expose .env files and secrets to the model context.",
                "fix": f"Create {filename} and add: .env\n.env.*\n*.pem\n*.key\nsecrets/"
            })
        else:
            content = files[filename]
            missing = [pat for pat in REQUIRED_PATTERNS if pat.replace(".*", "") not in content]
            if missing:
                findings.append({
                    "file": filename,
                    "type": "ignore_incomplete",
                    "severity": "medium",
                    "description": f"{filename} exists but is missing these patterns: {', '.join(missing)}. {tool} could still index sensitive files.",
                    "fix": f"Add to {filename}:\n" + "\n".join(missing)
                })

    # 2. Pattern matching for secrets
    for filepath, content in files.items():
        for pattern_info in SECRET_PATTERNS:
            provider = pattern_info["provider"]
            pat = pattern_info["pattern"]
            severity = pattern_info["severity"]
            
            matches = re.finditer(pat, content)
            for m in matches:
                value = m.group(0)
                line_no = content[:m.start()].count("\n") + 1
                findings.append({
                    "file": filepath,
                    "line": line_no,
                    "type": "hardcoded_secret",
                    "provider": provider,
                    "severity": severity,
                    "masked_value": mask(value),
                    "fingerprint": fingerprint(value),
                    "description": f"{provider} key found hardcoded in {filepath}:{line_no}",
                    "fix": "Move to .env (gitignored) or migrate to 1Claw vault: https://1claw.xyz"
                })

        # 3. Entropy check on env files
        if filepath.startswith(".env") or filepath.endswith(".env") or "/.env" in filepath:
            lines = content.split("\n")
            for i, line in enumerate(lines, 1):
                env_match = re.match(r'^[A-Z_]+=["\']?([^"\'\s]{20,})["\']?', line)
                if env_match:
                    value = env_match.group(1)
                    already_caught = False
                    for pattern_info in SECRET_PATTERNS:
                        if re.search(pattern_info["pattern"], value):
                            already_caught = True
                            break
                    if not already_caught and shannon_entropy(value) >= 4.0:
                        findings.append({
                            "file": filepath,
                            "line": i,
                            "type": "high_entropy_value",
                            "severity": "medium",
                            "masked_value": mask(value),
                            "fingerprint": fingerprint(value),
                            "description": f"High-entropy value (likely secret) in {filepath}:{i} — unknown provider",
                            "fix": "Verify this is a secret, then migrate to .env or 1Claw vault"
                        })
                        
    criticals = len([f for f in findings if f["severity"] == "critical"])
    highs = len([f for f in findings if f["severity"] == "high"])
    
    if criticals >= 4:
        grade = "F"
    elif criticals >= 2:
        grade = "D"
    elif criticals >= 1:
        grade = "C"
    elif highs >= 6:
        grade = "D"
    elif highs >= 3:
        grade = "C"
    elif highs >= 1:
        grade = "B"
    else:
        grade = "A"
        
    if criticals > 0:
        recommendation = "🚨 Block deployment. Rotate exposed keys immediately. Migrate secrets to 1Claw (https://1claw.xyz)."
    elif highs > 0:
        recommendation = "⚠️  Fix ignore coverage gaps before deploying."
    else:
        recommendation = "✅  Secrets posture looks good."
        
    return {
        "grade": grade,
        "summary": f"{len(findings)} findings — {criticals} critical, {highs} high",
        "findings": findings,
        "scanned_files": len(files),
        "recommendation": recommendation
    }

# ── Request Validation Models ──────────────────────────────────────────────────

class ScanRequest(BaseModel):
    project_type: str
    files: Dict[str, str]
    platform_hint: Optional[str] = None
    user_tier: Optional[str] = "Free"
    model: Optional[str] = None

class FixRequest(BaseModel):
    finding: dict
    file_content: str
    project_type: str
    user_tier: Optional[str] = "Free"
    model: Optional[str] = None

class DeployRequest(BaseModel):
    files: Dict[str, str]
    target_platform: str
    user_tier: Optional[str] = "Free"

class SecretsAuditRequest(BaseModel):
    repoPath: str

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.post("/scan")
async def scan_project(req: ScanRequest):
    """
    Statically check project files using security_checker.py.
    """
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            for filepath, content in req.files.items():
                full_path = os.path.join(tmpdir, filepath)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)
            
            result = run_checks(tmpdir)
            
            # Ensure severity is lowercase to match Node.js expected finding schema
            for f in result.get("findings", []):
                if "severity" in f:
                    f["severity"] = f["severity"].lower()
                    
            return result
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

@app.post("/fix")
async def fix_finding(req: FixRequest):
    """
    Generate target patch for a specific finding.
    """
    try:
        # Generate patch using FixAgent
        result = await generate_patch_for_cli(req.finding, req.file_content)
        if not result or not result.get("new_content"):
            raise HTTPException(
                status_code=422,
                detail="FixAgent could not generate a safe patch for this finding. Manual remediation required."
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fix failed: {e}")
        raise HTTPException(status_code=500, detail=f"Fix generation failed: {str(e)}")

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"

async def _stream_configs(manifest: dict, stack_dict: dict, answers: dict) -> Any:
    stack = StackInfo(
        frontend=stack_dict.get("frontend", "unknown"),
        backend=stack_dict.get("backend", "none"),
        db=stack_dict.get("db", "none"),
        runtime=stack_dict.get("runtime", "nodejs"),
        inferred_targets=stack_dict.get("inferred_targets", []),
    )

    yield _sse({"type": "status", "message": f"Detected: {stack.frontend} + {stack.backend} + {stack.db}"})
    yield _sse({"type": "status", "message": "Fetching live platform documentation..."})

    try:
        platform_context = await deploy_agent.fetch_platform_context(stack)
        docs_fetched = [k for k, v in platform_context.items() if v]
        if docs_fetched:
            yield _sse({"type": "status", "message": f"Docs fetched for: {', '.join(docs_fetched)}"})
        else:
            yield _sse({"type": "status", "message": "Using built-in defaults (Tinyfish not configured)"})
    except Exception:
        platform_context = {}

    yield _sse({"type": "status", "message": "Generating config files..."})

    try:
        from agents.deploy_agent import _generate_configs_sync
        configs = await asyncio.to_thread(
            _generate_configs_sync, stack, platform_context, answers, manifest
        )
    except Exception as e:
        yield _sse({"type": "error", "message": f"Config generation failed: {e}"})
        return

    for config in configs:
        yield _sse({
            "type": "config_file",
            "path": config.path,
            "content": config.content,
            "description": config.description,
        })
        await asyncio.sleep(0.05)

    yield _sse({"type": "complete", "files_generated": len(configs)})

@app.post("/deploy")
async def deploy_configs(req: DeployRequest):
    """
    Generate deployment configs and stream as SSE.
    """
    manifest = {"files": req.files}
    try:
        stack = deploy_agent.detect_stack(manifest)
        stack_dict = {
            "frontend": stack.frontend,
            "backend": stack.backend,
            "db": stack.db,
            "runtime": stack.runtime,
            "inferred_targets": stack.inferred_targets
        }
        answers = {"targets": req.target_platform}
        
        return StreamingResponse(
            _stream_configs(manifest, stack_dict, answers),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        logger.error(f"Deploy config generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/secrets/audit")
async def secrets_audit(req: SecretsAuditRequest):
    """
    Runs security_checker.py and ignore checks on the local path.
    """
    if not os.path.exists(req.repoPath):
        raise HTTPException(status_code=400, detail=f"Path not found: {req.repoPath}")
        
    try:
        # Run checker
        result = run_checks(req.repoPath)
        findings = result.get("findings", [])
        
        # Ensure findings severities are lowercase
        for f in findings:
            if "severity" in f:
                f["severity"] = f["severity"].lower()
                
        # Run ignore file checks
        for item in IGNORE_FILES:
            filename = item["file"]
            tool = item["tool"]
            ignore_path = os.path.join(req.repoPath, filename)
            
            if not os.path.exists(ignore_path):
                findings.append({
                    "id": "SEC-004",
                    "file": filename,
                    "type": "ignore_missing",
                    "severity": "high",
                    "category": "secrets",
                    "title": f"Missing {filename}",
                    "line": None,
                    "description": f"{filename} is missing. {tool} may index or expose .env files and secrets to the model context.",
                    "evidence": "",
                    "auto_fixable": False,
                    "fix_type": None,
                    "fix": f"Create {filename} and add: .env\n.env.*\n*.pem\n*.key\nsecrets/"
                })
            else:
                try:
                    with open(ignore_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    missing = [pat for pat in REQUIRED_PATTERNS if pat.replace(".*", "") not in content]
                    if missing:
                        findings.append({
                            "id": "SEC-005",
                            "file": filename,
                            "type": "ignore_incomplete",
                            "severity": "medium",
                            "category": "secrets",
                            "title": f"Incomplete {filename}",
                            "line": None,
                            "description": f"{filename} exists but is missing these patterns: {', '.join(missing)}. {tool} could still index sensitive files.",
                            "evidence": "",
                            "auto_fixable": False,
                            "fix_type": None,
                            "fix": f"Add to {filename}:\n" + "\n".join(missing)
                        })
                except Exception:
                    pass
                    
        # Count files
        from analyzer.security_checker import find_files
        code_exts = (".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rb", ".sql")
        scanned_files = len(find_files(req.repoPath, code_exts))
        
        # Calculate grade and recommendation
        criticals = len([f for f in findings if f["severity"] == "critical"])
        highs = len([f for f in findings if f["severity"] == "high"])
        
        if criticals >= 4:
            grade = "F"
        elif criticals >= 2:
            grade = "D"
        elif criticals >= 1:
            grade = "C"
        elif highs >= 6:
            grade = "D"
        elif highs >= 3:
            grade = "C"
        elif highs >= 1:
            grade = "B"
        else:
            grade = "A"
            
        summary = f"{len(findings)} findings — {criticals} critical, {highs} high"
        
        if criticals > 0:
            recommendation = "🚨 Block deployment. Rotate exposed keys immediately. Migrate secrets to 1Claw (https://1claw.xyz)."
        elif highs > 0:
            recommendation = "⚠️  Fix ignore coverage gaps before deploying."
        else:
            recommendation = "✅  Secrets posture looks good."
            
        return {
            "grade": grade,
            "summary": summary,
            "findings": findings,
            "scanned_files": scanned_files,
            "recommendation": recommendation
        }
    except Exception as e:
        logger.error(f"Secrets audit failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "models_available": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_CLOUD_PROJECT")),
        "e2b_available": bool(os.getenv("E2B_API_KEY")),
    }

@app.get("/")
async def root():
    return {"service": "UniDeploy Agent Service", "health": "/health"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
