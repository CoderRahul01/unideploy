from fastapi import (
    FastAPI,
    BackgroundTasks,
    HTTPException,
    UploadFile,
    File,
    Form,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    Request,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
import os
import asyncio
import shutil
import uuid
from typing import List

from agents.build_agent import BuildAgent
from agents.deploy_agent import DeployAgent
from agents.notify_agent import get_notify_agent
from agents.analyzer_agent import AnalyzerAgent
from agents.maintenance_agent import MaintenanceAgent
from core.orchestrator import deployment_flow
from database import get_db, engine
from utils.cost_manager import CostManager
from guards import SystemGuard, StateAuthority, StateMachine

from clients.model_router import router, TaskType
from clients.vision_agent import vision_agent
from clients.audio_agent import audio_agent
from clients.document_agent import document_agent

import models
import schemas
from logging_utils import log_intent
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials

# ── Upload security constants ────────────────────────────────────────────────
_ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_ALLOWED_AUDIO_MIME = {"audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"}
_ALLOWED_DOC_MIME   = {"application/pdf"}
_MAX_UPLOAD_BYTES   = 10 * 1024 * 1024  # 10 MB

def _safe_filename(name: str) -> str:
    """Strip path-traversal chars and return a plain basename."""
    return Path(name).name or "upload"

def _cleanup(path: str) -> None:
    try:
        shutil.rmtree(path, ignore_errors=True)
    except Exception:
        pass

load_dotenv()

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="UniDeploy Brain")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Firebase Setup
FIREBASE_CERT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
if FIREBASE_CERT_PATH and os.path.exists(FIREBASE_CERT_PATH):
    cred = credentials.Certificate(FIREBASE_CERT_PATH)
    firebase_admin.initialize_app(cred)
else:
    print("[Warning] Firebase Service Account JSON not found. Auth will be mocked.")


async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization.replace("Bearer ", "")

    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email")
        name = decoded_token.get("name", email)

        db_user = db.query(models.User).filter(models.User.clerk_id == uid).first()

        if not db_user:
            db_user = models.User(clerk_id=uid, username=name, email=email)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            print(f"[Auth] Created new user: {name} (ID: {db_user.id})")

        return {
            "id": db_user.id,
            "auth_id": uid,
            "email": db_user.email,
            "username": db_user.username,
        }

    except Exception as e:
        print(f"[Auth] Verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# Initialize Agents
build_agent = BuildAgent()
deploy_agent = DeployAgent()
notify_agent = get_notify_agent()
analyzer_agent = AnalyzerAgent()
maintenance_agent = MaintenanceAgent()
cost_manager = CostManager()


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(maintenance_agent.run_forever())
    print("[Core] Maintenance worker initiated.")

    from database import SessionLocal
    db = SessionLocal()
    try:
        print("[Startup] Commencing platform reconciliation...")
        db.query(models.Project).all()  # warm up connection
        db.commit()
    except Exception as e:
        print(f"[Startup] Reconciliation failed: {e}")
    finally:
        db.close()


# CORS Setup
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://unideploy.in,https://www.unideploy.in,https://api.unideploy.in")
origins = [o.strip() for o in raw_origins.split(",")]


@app.middleware("http")
async def cors_logging_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin:
        print(f"[CORS] Request from origin: {origin}")
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/deploy/{deployment_id}")
async def websocket_endpoint(websocket: WebSocket, deployment_id: str):
    await notify_agent.connect(websocket, deployment_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notify_agent.disconnect(websocket, deployment_id)


@app.post("/projects", response_model=schemas.Project)
async def create_project(
    project_data: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_project = models.Project(
        name=project_data.name,
        owner_id=user["id"],
        project_type=project_data.project_type,
        port=project_data.port,
        git_url=project_data.git_url,
        tier=project_data.tier,
        env_vars=project_data.env_vars,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@app.get("/projects", response_model=List[schemas.Project])
async def list_projects(db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_projects = db.query(models.Project).filter(models.Project.owner_id == user["id"]).all()
    for p in db_projects:
        effective_status = StateAuthority.get_effective_state(p, None)
        if p.status != effective_status and p.status not in ["WAKING", "CREATED"]:
            p.status = effective_status

        last_deploy = (
            db.query(models.Deployment)
            .filter(models.Deployment.project_id == p.id)
            .order_by(models.Deployment.created_at.desc())
            .first()
        )
        if last_deploy:
            p.latest_deployment_id = last_deploy.id

    return db_projects


@app.get("/projects/{project_id}", response_model=schemas.Project)
async def get_project(project_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == user["id"],
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    last_deploy = (
        db.query(models.Deployment)
        .filter(models.Deployment.project_id == project_id)
        .order_by(models.Deployment.created_at.desc())
        .first()
    )
    if last_deploy:
        project.latest_deployment_id = last_deploy.id
    return project


@app.post("/projects/{project_id}/chat")
@limiter.limit("20/minute")
async def project_chat(
    request: Request,
    project_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    AI chat endpoint for the project IDE.
    Body: { "message": "...", "history": [...] }
    """
    message = payload.get("message", "")
    history = payload.get("history", [])

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == user["id"],
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from agents.recallmax_agent import RecallMaxAgent
    recallmax = RecallMaxAgent()

    current_memory = project.context_memory or {}
    updated_memory, retained_history = await recallmax.compress_history(current_memory, history)

    # Save newly compressed memory if changed
    if str(updated_memory) != str(current_memory):
        project.context_memory = updated_memory
        db.commit()

    project_type = project.project_type or "unknown"
    system_prompt = (
        f"You are an AI coding assistant for a {project_type} project named '{project.name}'. "
        "Help the user understand and modify their code. Be concise and practical."
    )

    # Inject context memory seamlessly into the system prompt
    system_prompt_with_context = recallmax.inject_context(updated_memory, system_prompt)

    messages = [{"role": "system", "content": system_prompt_with_context}]
    
    # We only inject the retained uncompressed portion
    for h in retained_history[-10:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    # Use the ModelRouter for inference
    reply = await router.route(TaskType.CODE_GENERATION, messages)
    
    if not reply:
        reply = "I'm currently unavailable. Please check back in a moment."

    return {"reply": reply}


@app.post("/api/agent/vision")
async def agent_vision(
    background_tasks: BackgroundTasks,
    project_id: int = Form(...),
    mode: str = Form("screenshot_to_app"),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Image/screenshot -> code spec -> build in sandbox"""
    content = await image.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit")
    if image.content_type not in _ALLOWED_IMAGE_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {image.content_type}")

    temp_dir = f"/tmp/unideploy-multimodal/{uuid.uuid4()}"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, _safe_filename(image.filename or "upload.jpg"))
    with open(file_path, "wb") as buf:
        buf.write(content)

    background_tasks.add_task(_cleanup, temp_dir)

    if mode == "screenshot_to_app":
        spec = await vision_agent.screenshot_to_spec(file_path)
        background_tasks.add_task(handle_multimodal_intent, project_id, spec, db)
        return {"spec": spec, "mode": mode, "status": "processing"}
    else:
        # Error Fix Mode — run synchronously so the fix is returned as a chat reply
        error_text = await vision_agent.error_screenshot_to_text(file_path)
        from agents.autofix_agent import AutoFixAgent
        autofix = AutoFixAgent()
        fix = await autofix.analyze_and_fix(project_id, error_text)
        return {"spec": fix["suggestion"], "mode": mode, "status": "fixed"}


@app.post("/api/agent/voice")
async def agent_voice(
    background_tasks: BackgroundTasks,
    project_id: int = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Voice note -> transcribe -> intent -> code -> sandbox"""
    content = await audio.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Audio exceeds 10 MB limit")
    if audio.content_type not in _ALLOWED_AUDIO_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported audio type: {audio.content_type}")

    temp_dir = f"/tmp/unideploy-multimodal/{uuid.uuid4()}"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, _safe_filename(audio.filename or "voice.webm"))
    with open(file_path, "wb") as buf:
        buf.write(content)

    background_tasks.add_task(_cleanup, temp_dir)

    intent = await audio_agent.voice_to_intent(file_path)
    background_tasks.add_task(handle_multimodal_intent, project_id, intent, db)
    return {"intent": intent, "status": "processing"}


@app.post("/api/agent/document")
async def agent_document(
    background_tasks: BackgroundTasks,
    project_id: int = Form(...),
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """PDF spec -> requirements -> code -> sandbox"""
    content = await document.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Document exceeds 10 MB limit")
    if document.content_type not in _ALLOWED_DOC_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported document type: {document.content_type}")

    temp_dir = f"/tmp/unideploy-multimodal/{uuid.uuid4()}"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, _safe_filename(document.filename or "spec.pdf"))
    with open(file_path, "wb") as buf:
        buf.write(content)

    background_tasks.add_task(_cleanup, temp_dir)

    requirements = await document_agent.doc_to_requirements(file_path)
    background_tasks.add_task(handle_multimodal_intent, project_id, requirements, db)
    return {"requirements": requirements, "status": "processing"}


async def handle_multimodal_intent(project_id: int, intent: str, db: Session):
    """
    Bridge between multimodal extraction and the code-writing agents.
    Generates code using the model router and broadcasts it as a chat reply.
    """
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        return

    notify = get_notify_agent()

    await notify.broadcast_status(str(project_id), {
        "type": "agent_action",
        "status": "thinking",
        "message": "Analysing multimodal input and generating code...",
    })

    system_prompt = (
        f"You are a coding assistant for a {project.project_type or 'web'} project "
        f"named '{project.name}'. The user has provided a multimodal specification "
        "(extracted from a screenshot, voice note, or document). "
        "Generate precise, ready-to-use code that implements what is described. "
        "Include file paths, complete code blocks, and a brief explanation."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": intent},
    ]

    try:
        reply = await router.route(TaskType.CODE_GENERATION, messages)
    except Exception as e:
        print(f"[Multimodal] Code generation failed for project {project_id}: {e}")
        await notify.broadcast_status(str(project_id), {
            "type": "chat_reply",
            "role": "assistant",
            "content": f"Failed to generate code: {e}",
            "status": "error",
        })
        return

    await notify.broadcast_status(str(project_id), {
        "type": "chat_reply",
        "role": "assistant",
        "content": reply,
        "status": "ready",
    })

    print(f"[Multimodal] Code generated for project {project_id}")


@app.get("/projects/{project_id}/files")
async def get_project_files(project_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Returns the file tree from the live E2B sandbox."""
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == user["id"],
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    live_deploy = (
        db.query(models.Deployment)
        .filter(
            models.Deployment.project_id == project_id,
            models.Deployment.status == "live",
        )
        .order_by(models.Deployment.created_at.desc())
        .first()
    )

    if not live_deploy or not live_deploy.sandbox_id:
        return {"files": [], "status": "offline"}

    try:
        from e2b_code_interpreter import Sandbox
        api_key = os.getenv("E2B_API_KEY")
        sbx = Sandbox.connect(live_deploy.sandbox_id, api_key=api_key)
        raw_files = sbx.files.list("/home/user/project")

        nodes = []
        for entry in raw_files:
            name = entry.path.rsplit("/", 1)[-1]
            if entry.type == "dir":
                nodes.append({"name": name, "type": "directory", "children": []})
            else:
                nodes.append({"name": name, "type": "file"})

        return {"files": nodes, "status": "live"}
    except Exception as e:
        print(f"[Files] Could not list files for sandbox {live_deploy.sandbox_id}: {e}")
        return {"files": [], "status": "offline"}


@app.post("/analyze")
async def analyze_repo(
    repo_url: str, bg_tasks: BackgroundTasks, user=Depends(get_current_user)
):
    print(f"[API] Analyze requested for {repo_url} by {user['username']}")
    result = await analyzer_agent.analyze(repo_url, user["id"])
    return result


@app.post("/analyze/zip")
async def analyze_zip(file: UploadFile = File(...), user=Depends(get_current_user)):
    import zipfile
    print(f"[API] Zip Analysis requested for {file.filename} by {user['username']}")

    project_id = str(uuid.uuid4())
    temp_dir = os.path.join("/tmp/unideploy-analysis", project_id)
    os.makedirs(temp_dir, exist_ok=True)
    zip_path = os.path.join(temp_dir, "upload.zip")

    try:
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)
        result = await analyzer_agent.analyze_path(temp_dir, project_id)
        return result
    except Exception as e:
        print(f"[API] Zip Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projects/{project_id}/start")
async def start_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.owner_id == user["id"])
        .with_for_update()
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.is_locked:
        raise HTTPException(status_code=409, detail="Project action already in progress")

    can_start, msg = SystemGuard.can_start_project(project, db)
    if not can_start:
        log_intent(project_id, 1, "START", "REJECTED", msg)
        raise HTTPException(status_code=400, detail=msg)

    original_status = project.status
    try:
        StateMachine.validate_transition(original_status, "WAKING")
        project.is_locked = 1
        project.status = "WAKING"
        db.commit()

        last_deploy = (
            db.query(models.Deployment)
            .filter(models.Deployment.project_id == project_id)
            .order_by(models.Deployment.created_at.desc())
            .first()
        )

        if not last_deploy:
            raise Exception("No deployment found to wake up from")

        background_tasks.add_task(
            deployment_flow,
            deployment_id=last_deploy.id,
            project_name=project.name,
            repo_url=project.git_url,
        )

        return {"status": "WAKING", "message": "Project waking up..."}
    except Exception as e:
        db.rollback()
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        project.status = original_status
        project.is_locked = 0
        db.commit()
        log_intent(project_id, 1, "START", "FAILED", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start: {e}")


from builder.deploy_agent import deploy_agent as production_deploy_agent
from core.credit_guard import credit_guard

@app.post("/api/deploy/{project_id}")
async def deploy_project_production(
    project_id: int,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Triggers a production deployment to Google Cloud Run.
    Consumes 100 credits.
    """
    # 1. Guard — raises 402 if not enough credits, deducts if enough
    await credit_guard.check_and_deduct(user["id"], project_id, db)

    # 2. Get the active sandbox for this project
    # We find the latest live deployment to E2B
    last_deploy = (
        db.query(models.Deployment)
        .filter(
            models.Deployment.project_id == project_id,
            models.Deployment.status == "live",
            models.Deployment.sandbox_id != None
        )
        .order_by(models.Deployment.created_at.desc())
        .first()
    )

    if not last_deploy or not last_deploy.sandbox_id:
        # Refund credits if no sandbox found
        await credit_guard.refund(user["id"], project_id, db)
        raise HTTPException(status_code=400, detail="No active sandbox found for this project. Please build it first.")

    # 3. Create production deployment record
    prod_deploy = models.Deployment(
        project_id=project_id,
        status="building",
    )
    db.add(prod_deploy)
    db.commit()
    db.refresh(prod_deploy)

    # 4. Broadcast status via WebSocket
    await notify_agent.broadcast_status(str(project_id), {
        "type": "deploy_status",
        "status": "building",
        "deployment_id": str(prod_deploy.id),
        "message": "Starting production build on Google Cloud..."
    })

    # 5. Run deploy in background
    background_tasks.add_task(
        _run_production_deploy,
        project_id, last_deploy.sandbox_id, prod_deploy.id, user["id"], db
    )

    return {"deployment_id": prod_deploy.id, "status": "building"}


async def _run_production_deploy(project_id: int, sandbox_id: str, deployment_id: int, user_id: int, db: Session):
    try:
        result = await production_deploy_agent.deploy(str(project_id), sandbox_id)

        # Update deployment record
        dep = db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
        dep.status = "live"
        dep.sandbox_url = result["url"]
        dep.custom_domain = result["custom_domain"]
        db.commit()

        # Broadcast success
        await notify_agent.broadcast_status(str(project_id), {
            "type": "deploy_status",
            "status": "live",
            "url": result["url"],
            "custom_domain": result["custom_domain"],
            "message": "Production deployment is LIVE!"
        })

    except Exception as e:
        print(f"[ProductionDeploy] Failed: {e}")
        # Refund credits on failure
        from database import SessionLocal
        inner_db = SessionLocal()
        try:
            await credit_guard.refund(user_id, project_id, inner_db)
            
            dep = inner_db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
            if dep:
                dep.status = "failed"
                dep.error_message = str(e)
                inner_db.commit()

            await notify_agent.broadcast_status(str(project_id), {
                "type": "deploy_status",
                "status": "failed",
                "error": str(e),
                "message": f"Production deployment failed: {str(e)}"
            })
        finally:
            inner_db.close()


@app.post("/deployments/{deployment_id}/apply-fix")
async def apply_deployment_fix(
    deployment_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Triggered from the UI when a deployment has failed and the user wants to
    apply the AI-suggested fix and re-deploy.
    """
    dep = db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")

    # Verify ownership through the project
    project = db.query(models.Project).filter(
        models.Project.id == dep.project_id,
        models.Project.owner_id == user["id"],
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if dep.status != "failed":
        raise HTTPException(status_code=400, detail="Deployment is not in a failed state")

    error_log = dep.error_message or "Unknown build error"

    # Create a new deployment record for the retry
    retry_dep = models.Deployment(project_id=dep.project_id, status="queued")
    db.add(retry_dep)
    db.commit()
    db.refresh(retry_dep)

    async def _fix_and_redeploy():
        from agents.autofix_agent import AutoFixAgent
        autofix = AutoFixAgent()
        fix = await autofix.analyze_and_fix(dep.project_id, error_log)
        # Broadcast the fix suggestion before re-deploying
        await notify_agent.broadcast_status(str(retry_dep.id), {
            "type": "autofix",
            "suggestion": fix.get("suggestion", ""),
            "message": "Applying AI fix and redeploying...",
        })
        await deployment_flow(
            deployment_id=retry_dep.id,
            project_name=project.name,
            repo_url=project.git_url,
        )

    background_tasks.add_task(_fix_and_redeploy)
    return {"deployment_id": retry_dep.id, "status": "queued", "message": "Fix applied, redeploying..."}


@app.get("/deployments/{deployment_id}", response_model=schemas.Deployment)
async def get_deployment_status(deployment_id: int, db: Session = Depends(get_db)):
    db_deploy = (
        db.query(models.Deployment)
        .filter(models.Deployment.id == deployment_id)
        .first()
    )
    if not db_deploy:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return db_deploy


@app.post("/projects/{project_id}/stop")
async def stop_project(project_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.owner_id == user["id"])
        .with_for_update()
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.is_locked:
        raise HTTPException(status_code=409, detail="Project action in progress")

    if SystemGuard.is_read_only():
        log_intent(project_id, 1, "STOP", "REJECTED", "Platform is READ-ONLY")
        raise HTTPException(status_code=503, detail="Platform is in READ-ONLY mode")

    original_status = project.status
    try:
        StateMachine.validate_transition(original_status, "SLEEPING")
        project.is_locked = 1
        db.commit()

        last_deploy = (
            db.query(models.Deployment)
            .filter(
                models.Deployment.project_id == project_id,
                models.Deployment.status == "live",
            )
            .order_by(models.Deployment.created_at.desc())
            .first()
        )

        if last_deploy and last_deploy.sandbox_id:
            await deploy_agent.stop(last_deploy.sandbox_id)

        project.status = "SLEEPING"
        project.is_locked = 0
        db.commit()
        log_intent(project_id, 1, "STOP", "SUCCESS")
        return {"status": "SLEEPING", "message": "Project stopped"}
    except Exception as e:
        db.rollback()
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        project.is_locked = 0
        db.commit()
        log_intent(project_id, 1, "STOP", "FAILED", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to stop: {e}")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "UniDeploy Brain API",
        "version": "1.0.0",
        "branding": "UniDeploy - One-Click Automated Deployment",
    }


@app.get("/system/config")
async def get_system_config():
    return {
        "read_only": SystemGuard.is_read_only(),
        "maintenance": SystemGuard.is_read_only(),
        "daily_limit_mins": int(os.getenv("DAILY_RUNTIME_LIMIT_MINS", 60)),
    }


@app.get("/system/cost")
async def get_system_cost():
    return cost_manager.get_summary()


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    project_count = db.query(models.Project).count()
    deployment_count = db.query(models.Deployment).count()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "stats": {
            "projects": project_count,
            "total_deployments": deployment_count,
            "engine": "E2B Firecracker",
            "region": os.getenv("AWS_REGION", "us-east-1"),
        },
    }


@app.post("/deploy/{project_id}/git")
@limiter.limit("5/minute")
async def deploy_git(
    request: Request,
    project_id: int,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    repo_url = payload.get("repo_url")
    if not repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")

    can_build, build_msg = SystemGuard.can_build_project(db)
    if not can_build:
        raise HTTPException(status_code=503, detail=build_msg)

    # Deduct credits for standard build (e.g., 20 credits)
    # We use check_and_deduct which will handle the cost based on tier
    # but maybe standard builds are cheaper. For now, let's keep it consistent
    # or add a specific build_cost.
    await credit_guard.check_and_deduct(user["id"], project_id, db)

    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == user["id"],
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db_deploy = models.Deployment(project_id=project_id, status="queued")
    db.add(db_deploy)
    db.commit()
    db.refresh(db_deploy)

    background_tasks.add_task(
        deployment_flow,
        deployment_id=db_deploy.id,
        project_name=project.name,
        repo_url=repo_url,
    )

    return {"deployment_id": db_deploy.id, "status": "queued"}
