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
from sqlalchemy.orm import Session
import os
import asyncio
import shutil
import uuid
from typing import List

from agents.build_agent import BuildAgent
from agents.deploy_agent import DeployAgent
from agents.notify_agent import NotifyAgent
from agents.analyzer_agent import AnalyzerAgent
from agents.memory_agent import MemoryAgent
from agents.autofix_agent import AutoFixAgent
from agents.patch_agent import PatchAgent
from database import get_db, engine
from utils.cost_manager import CostManager
import models
import schemas
from logging_utils import log_intent
from datetime import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials

import time
from metrics import (
    metrics_app,
    HTTP_REQUEST_DURATION,
    DEPLOYMENT_DURATION,
    track_deployment,
    SANDBOXES_ACTIVE,
)

load_dotenv()

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="UniDeploy Brain")

# Mount Prometheus metrics
app.mount("/metrics", metrics_app)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Skip metrics for /metrics itself to avoid noise
    if request.url.path != "/metrics":
        endpoint = request.url.path
        method = request.method
        HTTP_REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(process_time)
        
    return response

# Firebase Setup
FIREBASE_CERT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
if FIREBASE_CERT_PATH and os.path.exists(FIREBASE_CERT_PATH):
    cred = credentials.Certificate(FIREBASE_CERT_PATH)
    firebase_admin.initialize_app(cred)
else:
    print("[Warning] Firebase Service Account JSON not found. Auth will be mocked.")


from fastapi import Header

async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        # For dev convenience, if no header, assume mock user IF allowed (check read_only or similar?)
        # Or better, check for 'token' query param as fallback
        return {"id": 1, "username": "mock_user", "email": "mock@local"}

    token = authorization.replace("Bearer ", "")
    
    try:
        # 1. Verify Firebase Token
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email")
        name = decoded_token.get("name", email)
        
        # 2. Sync with Database
        db_user = db.query(models.User).filter(models.User.clerk_id == uid).first()
        
        if not db_user:
            # Create new user
            db_user = models.User(
                clerk_id=uid,
                username=name,
                email=email
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            print(f"[Auth] Created new user: {name} (ID: {db_user.id})")
        
        return {
            "id": db_user.id, # Integer ID
            "auth_id": uid,   # Firebase String ID
            "email": db_user.email,
            "username": db_user.username,
        }
        
    except Exception as e:
        print(f"[Auth] Verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# Initialize Agents
AWS_REGISTRY = os.getenv("AWS_ECR_REGISTRY_URL")
build_agent = BuildAgent(registry_url=AWS_REGISTRY)
deploy_agent = DeployAgent()
notify_agent = NotifyAgent()
analyzer_agent = AnalyzerAgent()
from agents.maintenance_agent import MaintenanceAgent

memory_agent = MemoryAgent()
autofix_agent = AutoFixAgent()
patch_agent = PatchAgent()
maintenance_agent = MaintenanceAgent()
cost_manager = CostManager()

@app.on_event("startup")
async def startup_event():
    """
    Consolidated startup tasks:
    1. Start maintenance tasks
    2. Platform reconciliation (Sync DB with real infra)
    """
    # 1. Start maintenance agent
    asyncio.create_task(maintenance_agent.run_forever())
    print("[Core] Maintenance worker initiated.")

    # 2. Reconciliation
    from database import SessionLocal
    from guards import StateAuthority

    db = SessionLocal()
    try:
        print("[Startup] Commencing platform reconciliation...")
        # Since we use E2B, we might not have a reliable way to 'check' sandbox status 
        # unless we call E2B API for each deployment. For now, we sync what we can.
        projects = db.query(models.Project).all()
        for p in projects:
            # Note: StateAuthority might still expect K8s. We can skip or adapt it.
            # effective = StateAuthority.get_effective_state(p, deploy_agent.e2b)
            # p.status = effective
            pass
        db.commit()
    except Exception as e:
        print(f"[Startup] Reconciliation failed: {e}")
    finally:
        db.close()

# CORS Setup

raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if raw_origins:
    origins = [o.strip() for o in raw_origins.split(",")]
else:
    # If using proxy, the origin might be localhost or the frontend domain
    # We add specific handling for development and production
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://unideploy.in",
        "https://www.unideploy.in",
        "https://api.unideploy.in",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def run_deployment_pipeline(
    deployment_id: int, project_path: str, project_name: str, db: Session, repo_url: str = None
):
    """
    Automated agent-based deployment pipeline with DB updates.
    """
    # Give the frontend a tiny moment to connect to the WebSocket after the POST returns
    await asyncio.sleep(1)
    try:
        if repo_url:
            work_dir = f"../temp/{deployment_id}"
            os.makedirs(work_dir, exist_ok=True)
            project_path = work_dir
            from git import Repo
            await notify_agent.broadcast_status(
                str(deployment_id),
                {"status": "cloning", "message": f"Cloning {repo_url}..."}
            )
            Repo.clone_from(repo_url, project_path)
            print(f"[Pipeline] Cloned {repo_url} to {project_path}")

        # 1. Build Phase
        await notify_agent.broadcast_status(
            str(deployment_id),
            {"status": "building", "message": "Starting build agent..."},
        )
        
        async def build_log_callback(msg: str):
             # 1. Update dashboard status
             await notify_agent.broadcast_status(
                str(deployment_id),
                {"status": "building", "log": msg}
            )
             # 2. Push to Gateway for Terminal display (Socket.io bridge)
             try:
                 gateway_url = os.getenv("GATEWAY_URL", "http://localhost:3001")
                 import requests
                 requests.post(
                     f"{gateway_url}/internal/logs",
                     json={"deploymentId": str(deployment_id), "log": msg},
                     timeout=1
                 )
             except Exception as e:
                 print(f"[Pipeline] Failed to push build log to gateway: {e}")

        image_tag = await build_agent.run(project_path, project_name, log_callback=build_log_callback)

        # Update DB: Building complete
        db_deploy = (
            db.query(models.Deployment)
            .filter(models.Deployment.id == deployment_id)
            .first()
        )
        db_deploy.status = "deploying"
        db_deploy.image_tag = image_tag

        # Update project status to BUILT
        project = (
            db.query(models.Project)
            .filter(models.Project.id == db_deploy.project_id)
            .first()
        )
        
        # 1.5 Index for Dual Memory (Pinecone)
        if project:
            try:
                await notify_agent.broadcast_status(
                    str(deployment_id),
                    {"status": "indexing", "message": "Indexing codebase for Auto-Fix support..."}
                )
                memory_agent.index_project(project.id, project_path)
            except Exception as e:
                print(f"[Pipeline] Indexing failed: {e}")

        # 2. Deploy Phase
        await notify_agent.broadcast_status(
            str(deployment_id),
            {
                "status": "deploying",
                "message": "Build successful. Starting deployment agent...",
            },
        )
        project_data = {
            "id": project.id,
            "project_name": project.name,
            "image_name": image_tag,
            "repo_url": repo_url,
            "port": project.port or 80,
            "tier": project.tier or "SEED",
            "env_vars": project.env_vars or {},
        }
        
        # Track deployment duration and active sandboxes
        with DEPLOYMENT_DURATION.labels(tier=project.tier).time():
            SANDBOXES_ACTIVE.inc()
            try:
                deployment_res = await deploy_agent.run(project_data)
                track_deployment("success", project.tier)
                
                # 3. Success
                if deployment_res and deployment_res["status"] == "live":
                    db_deploy.status = "live"
                    db_deploy.sandbox_id = deployment_res["sandbox_id"]
                    # Generate Vercel-like domain pattern
                    db_deploy.domain = f"{project.name.lower().replace(' ', '-')}.app.unideploy.in"
                    
                    # Update project state
                    StateMachine.validate_transition(project.status, "RUNNING")
                    project.status = "RUNNING"
                    project.last_active_at = datetime.utcnow()
                    db.commit()
                    log_intent(project.id, 1, "DEPLOY", "SUCCESS")

                    await notify_agent.broadcast_status(
                        str(deployment_id),
                        {
                            "status": "live",
                            "domain": f"{project.name.lower().replace(' ', '-')}.app.unideploy.in",
                            "message": "Deployment is live!",
                        },
                    )
                    
                    # 4. Log initial cost estimate
                    if deployment_res.get("id"):
                        # For now we log 0 duration to mark the 'start' event, or log the setup cost
                        cost_manager.log_sandbox_usage(deployment_res["id"], duration_seconds=60, tier=project.tier)
            except Exception as e:
                track_deployment("failed", project.tier)
                SANDBOXES_ACTIVE.dec()
                raise e

    except Exception as e:
        print(f"[Core] Pipeline failed for {deployment_id}: {e}")
        db_deploy = (
            db.query(models.Deployment)
            .filter(models.Deployment.id == deployment_id)
            .first()
        )
        if db_deploy:
            db_deploy.status = "failed"
            db_deploy.error_message = str(e) # Added error_message field
            db.commit()
        
        # 4. Auto-Fix Intelligence
        try:
            print(f"[Pipeline] Build failed. Triggering Auto-Fix for project {db_deploy.project_id}...")
            # We use the exception message as the 'error_log' for now.
            # In a real scenario, we'd fetch the actual captured shell output.
            fix_result = await autofix_agent.analyze_and_fix(db_deploy.project_id, str(e))
            
            await notify_agent.broadcast_status(
                str(deployment_id),
                {
                    "status": "failed",
                    "error": f"Deployment failed: {str(e)}", # Changed 'message' to 'error'
                    "message": f"Deployment failed: {str(e)}", # Keep message for backward compat
                    "autofix": fix_result
                }
            )
        except Exception as af_error:
            print(f"[Pipeline] Auto-Fix failed: {af_error}")
            await notify_agent.broadcast_status(
                str(deployment_id), 
                {
                    "status": "failed", 
                    "error": f"Deployment failed: {str(e)}",
                    "message": f"Deployment failed: {str(e)}"
                }
            )
    finally:
        db.close()


@app.websocket("/ws/deploy/{deployment_id}")
async def websocket_endpoint(websocket: WebSocket, deployment_id: str):
    await notify_agent.connect(websocket, deployment_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notify_agent.disconnect(websocket, deployment_id)


@app.post("/projects", response_model=schemas.Project)
async def create_project(project_data: schemas.ProjectCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
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


from guards import SystemGuard, StateAuthority, StateMachine


@app.get("/projects", response_model=List[schemas.Project])
async def list_projects(db: Session = Depends(get_db)):
    db_projects = db.query(models.Project).all()
    # Sync status with StateAuthority for truth
    for p in db_projects:
        effective_status = StateAuthority.get_effective_state(
            p, None
        )
        if p.status != effective_status and p.status not in ["WAKING", "CREATED"]:
            p.status = effective_status
        
        # Populate latest_deployment_id
        last_deploy = (
            db.query(models.Deployment)
            .filter(models.Deployment.project_id == p.id)
            .order_by(models.Deployment.created_at.desc())
            .first()
        )
        if last_deploy:
            p.latest_deployment_id = last_deploy.id
            
    return db_projects


@app.post("/analyze")
async def analyze_repo(
    repo_url: str, bg_tasks: BackgroundTasks, user=Depends(get_current_user)
):
    """
    Triggers the Smart Analysis for a GitHub Repo.
    """
    print(f"[API] Analyze requested for {repo_url} by {user['username']}")
    # Call agent directly for now, usually async
    result = await analyzer_agent.analyze(repo_url, user["id"])
    return result


@app.post("/analyze/zip")
async def analyze_zip(
    file: UploadFile = File(...), user=Depends(get_current_user)
):
    """
    Triggers the Smart Analysis for an uploaded ZIP file.
    """
    import zipfile
    print(f"[API] Zip Analysis requested for {file.filename} by {user['username']}")
    
    project_id = str(uuid.uuid4())
    temp_dir = os.path.join("../temp_analysis", project_id)
    os.makedirs(temp_dir, exist_ok=True)
    zip_path = os.path.join(temp_dir, "upload.zip")
    
    try:
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Run analysis on extracted files
        result = await analyzer_agent.analyze_path(temp_dir, project_id)
        return result
    except Exception as e:
        print(f"[API] Zip Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup is tricky if we want to return results immediately
        # We'll leave it in temp_analysis for now or cleanup in background
        pass


@app.post("/projects/{project_id}/start")
async def start_project(project_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Acquire Lock & Fetch
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id)
        .with_for_update()
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.is_locked:
        raise HTTPException(
            status_code=409, detail="Project action already in progress"
        )

    # 2. System Guard Checks
    can_start, msg = SystemGuard.can_start_project(project, db)
    if not can_start:
        log_intent(project_id, 1, "START", "REJECTED", msg)
        raise HTTPException(status_code=400, detail=msg)

    # 3. Transactional Mutation
    original_status = project.status
    try:
        StateMachine.validate_transition(original_status, "WAKING")
        project.is_locked = 1
        project.status = "WAKING"
        db.commit()

        # For E2B, waking means running the deployment pipeline again
        # We fetch the latest deployment to get the image/repo info
        last_deploy = db.query(models.Deployment).filter(models.Deployment.project_id == project_id).order_by(models.Deployment.created_at.desc()).first()
        
        if not last_deploy:
            raise Exception("No deployment found to wake up from")

        # We use background tasks to run the pipeline
        background_tasks.add_task(
            run_deployment_pipeline,
            last_deploy.id,
            None,
            project.name,
            SessionLocal(),
            repo_url=project.git_url
        )
        
        return {"status": "WAKING", "message": "Project waking up..."}
    except Exception as e:
        db.rollback()
        # Rollback state
        project = (
            db.query(models.Project).filter(models.Project.id == project_id).first()
        )
        project.status = original_status
        project.is_locked = 0
        db.commit()
        log_intent(project_id, 1, "START", "FAILED", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start: {e}")


@app.post("/deploy/{project_id}")
async def trigger_deploy(
    project_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # 1. Platform Guard
    can_build, build_msg = SystemGuard.can_build_project(db)
    if not can_build:
        log_intent(project_id, 1, "DEPLOY", "REJECTED", build_msg)
        raise HTTPException(status_code=503, detail=build_msg)

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # 2. Size Guard
    success, msg = SystemGuard.validate_upload(file.size or 0)
    if not success:
        log_intent(project_id, 1, "DEPLOY", "REJECTED", msg)
        raise HTTPException(status_code=413, detail=msg)

    # System Guard validation (concurrent builds)
    can_build, build_msg = SystemGuard.can_build_project(db)
    if not can_build:
        raise HTTPException(status_code=503, detail=build_msg)

    # Create deployment record
    db_deploy = models.Deployment(project_id=project_id, status="queued")
    db.add(db_deploy)
    db.commit()
    db.refresh(db_deploy)

    # Save file
    os.makedirs(f"../temp/{db_deploy.id}", exist_ok=True)
    temp_path = f"../temp/{db_deploy.id}/source.zip"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    project_path = f"../temp/{db_deploy.id}"

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    background_tasks.add_task(
        run_deployment_pipeline,
        db_deploy.id,
        project_path,
        project.name,
        SessionLocal(),
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

        # For E2B, stop means killing the active sandbox
        last_deploy = db.query(models.Deployment).filter(models.Deployment.project_id == project_id, models.Deployment.status == "live").order_by(models.Deployment.created_at.desc()).first()
        
        if last_deploy and last_deploy.sandbox_id:
            await deploy_agent.stop(last_deploy.sandbox_id)

        project.status = "SLEEPING"
        project.is_locked = 0
        db.commit()
        log_intent(project_id, 1, "STOP", "SUCCESS")
        return {"status": "SLEEPING", "message": "Project stopped"}
    except Exception as e:
        db.rollback()
        project = (
            db.query(models.Project).filter(models.Project.id == project_id).first()
        )
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
        "branding": "UniDeploy - One-Click Automated Deployment"
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
    """
    Returns the current cost summary from local storage.
    """
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
        }
    }


@app.post("/deploy/{project_id}/git")
async def deploy_git(
    project_id: int,
    payload: dict,  # {"repo_url": "..."}
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    repo_url = payload.get("repo_url")
    if not repo_url:
        raise HTTPException(status_code=400, detail="repo_url is required")

    # 1. Platform Guard
    can_build, build_msg = SystemGuard.can_build_project(db)
    if not can_build:
        raise HTTPException(status_code=503, detail=build_msg)

    # 2. Create deployment record
    db_deploy = models.Deployment(project_id=project_id, status="queued")
    db.add(db_deploy)
    db.commit()
    db.refresh(db_deploy)

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from database import SessionLocal

    background_tasks.add_task(
        run_deployment_pipeline,
        db_deploy.id,
        None,  # local path is None for git
        project.name,
        SessionLocal(),
        repo_url=repo_url
    )

    return {"deployment_id": db_deploy.id, "status": "queued"}


@app.post("/deployments/{deployment_id}/apply-fix")
async def apply_fix(deployment_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Applies the AI-suggested fix to the project codebase and triggers a redeploy.
    """
    db_deploy = db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
    if not db_deploy:
        raise HTTPException(status_code=404, detail="Deployment not found")

    project = db_deploy.project
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    print(f"[Self-Healing] Applying fix for project {project.id}...")
    
    # 1. Get the suggestion
    error_log = db_deploy.error_message or "Unknown error"
    fix_result = await autofix_agent.analyze_and_fix(project.id, error_log)
    
    if not fix_result or not fix_result.get("suggestion"):
        raise HTTPException(status_code=400, detail="Could not generate a fix to apply")

    # 2. Apply the patch 
    # Use the same ../temp location if possible or consistent
    work_dir = os.path.join(os.getcwd(), f"../temp/build_{project.id}")
    focus_file = fix_result.get("focus_file", "unknown")
    abs_path = os.path.join(work_dir, focus_file if focus_file != "unknown" else "index.js")
    
    if os.path.exists(abs_path):
        with open(abs_path, "r") as f:
            original = f.read()
        
        patched = await patch_agent.apply_fix(focus_file, fix_result["suggestion"], original)
        if patched:
            with open(abs_path, "w") as f:
                f.write(patched)
            print(f"[Self-Healing] Patch applied to {abs_path}")
            
            # 3. Store Wisdom in SuperMemory
            memory_agent.store_wisdom(f"Successfully applied fix for error: {error_log}. Fixed file: {focus_file}", project.id)
            
            # 4. Trigger Redeploy
            background_tasks.add_task(
                run_deployment_pipeline, 
                deployment_id, 
                db, 
                project.id, 
                work_dir, 
                project.name, 
                project.git_url
            )
            
            return {"status": "success", "message": f"Fix applied to {focus_file}. Redeploying...", "patched_file": focus_file}

    raise HTTPException(status_code=500, detail="Failed to locate file to patch or patch generation failed")

