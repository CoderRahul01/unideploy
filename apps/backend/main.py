from fastapi import (
    FastAPI,
    BackgroundTasks,
    HTTPException,
    UploadFile,
    File,
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
import models
import schemas
from logging_utils import log_intent
from datetime import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials

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
        return {"id": 1, "username": "mock_user", "email": "mock@local"}

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
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [o.strip() for o in raw_origins.split(",")] if raw_origins else [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://unideploy.in",
    "https://www.unideploy.in",
    "https://api.unideploy.in",
]


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
async def list_projects(db: Session = Depends(get_db)):
    db_projects = db.query(models.Project).all()
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
async def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
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

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from clients.llm_client import LLMClient
    llm = LLMClient()

    project_type = project.project_type or "unknown"
    system_prompt = (
        f"You are an AI coding assistant for a {project_type} project named '{project.name}'. "
        "Help the user understand and modify their code. Be concise and practical."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    reply = llm.chat_completion(messages)
    if not reply:
        reply = "I'm currently unavailable. Please check back in a moment."

    return {"reply": reply}


@app.get("/projects/{project_id}/files")
async def get_project_files(project_id: int, db: Session = Depends(get_db)):
    """Returns the file tree from the live E2B sandbox."""
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
    project_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id)
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


@app.post("/deploy/{project_id}")
@limiter.limit("5/minute")
async def trigger_deploy(
    request: Request,
    project_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    can_build, build_msg = SystemGuard.can_build_project(db)
    if not can_build:
        log_intent(project_id, 1, "DEPLOY", "REJECTED", build_msg)
        raise HTTPException(status_code=503, detail=build_msg)

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    success, msg = SystemGuard.validate_upload(file.size or 0)
    if not success:
        log_intent(project_id, 1, "DEPLOY", "REJECTED", msg)
        raise HTTPException(status_code=413, detail=msg)

    db_deploy = models.Deployment(project_id=project_id, status="queued")
    db.add(db_deploy)
    db.commit()
    db.refresh(db_deploy)

    os.makedirs(f"/tmp/unideploy/{db_deploy.id}", exist_ok=True)
    temp_path = f"/tmp/unideploy/{db_deploy.id}/source.zip"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    background_tasks.add_task(
        deployment_flow,
        deployment_id=db_deploy.id,
        project_name=project.name,
        project_path=f"/tmp/unideploy/{db_deploy.id}",
    )

    return {"deployment_id": db_deploy.id, "status": "queued"}


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
async def stop_project(project_id: int, db: Session = Depends(get_db)):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id)
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
):
    repo_url = payload.get("repo_url")
    if not repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")

    can_build, build_msg = SystemGuard.can_build_project(db)
    if not can_build:
        raise HTTPException(status_code=503, detail=build_msg)

    db_deploy = models.Deployment(project_id=project_id, status="queued")
    db.add(db_deploy)
    db.commit()
    db.refresh(db_deploy)

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    background_tasks.add_task(
        deployment_flow,
        deployment_id=db_deploy.id,
        project_name=project.name,
        repo_url=repo_url,
    )

    return {"deployment_id": db_deploy.id, "status": "queued"}
