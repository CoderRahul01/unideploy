from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import shutil
import uuid
from typing import List

from agents.build_agent import BuildAgent
from agents.deploy_agent import DeployAgent
from agents.notify_agent import NotifyAgent
from agents.analyzer_agent import AnalyzerAgent
from database import get_db, engine
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

app = FastAPI(title="UniDeploy API - Production Core")

# Firebase Setup
FIREBASE_CERT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
if FIREBASE_CERT_PATH and os.path.exists(FIREBASE_CERT_PATH):
    cred = credentials.Certificate(FIREBASE_CERT_PATH)
    firebase_admin.initialize_app(cred)
else:
    print("[Warning] Firebase Service Account JSON not found. Auth will be mocked.")

async def get_current_user(token: str = None):
    if not token:
        return {"id": 1, "username": "mock_user"}
    
    try:
        decoded_token = auth.verify_id_token(token)
        return {
            "id": decoded_token['uid'],
            "email": decoded_token.get('email'),
            "username": decoded_token.get('name', decoded_token.get('email'))
        }
    except Exception as e:
        print(f"[Auth] Firebase token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# Initialize Agents
AWS_REGISTRY = os.getenv("AWS_ECR_REGISTRY_URL")
build_agent = BuildAgent(registry_url=AWS_REGISTRY)
deploy_agent = DeployAgent()
notify_agent = NotifyAgent()
analyzer_agent = AnalyzerAgent()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """
    Reconciliation on startup. Ensures reality sync before traffic.
    """
    from database import SessionLocal
    from guards import StateAuthority
    db = SessionLocal()
    try:
        print("[Startup] Commencing platform reconciliation...")
        projects = db.query(models.Project).all()
        for p in projects:
            effective = StateAuthority.get_effective_state(p, deploy_agent.manager.k8s_client)
            if p.status != effective and p.status not in ["WAKING", "CREATED"]:
                print(f"[Startup] Syncing {p.name}: {p.status} -> {effective}")
                p.status = effective
        db.commit()
    except Exception as e:
        print(f"[Startup] Reconciliation failed: {e}")
    finally:
        db.close()

async def run_deployment_pipeline(deployment_id: int, project_path: str, project_name: str, db: Session):
    """
    Automated agent-based deployment pipeline with DB updates.
    """
    try:
        # 1. Build Phase
        await notify_agent.broadcast_status(str(deployment_id), {"status": "building", "message": "Starting build agent..."})
        image_tag = await build_agent.run(project_path, project_name)
        
        # Update DB: Building complete
        db_deploy = db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
        db_deploy.status = "deploying"
        db_deploy.image_tag = image_tag
        
        # Update project status to BUILT
        project = db.query(models.Project).filter(models.Project.id == db_deploy.project_id).first()
        StateMachine.validate_transition(project.status, "BUILT")
        project.status = "BUILT"
        db.commit()

        # 2. Deploy Phase
        await notify_agent.broadcast_status(str(deployment_id), {"status": "deploying", "message": "Build successful. Starting deployment agent..."})
        project_data = {
            "project_name": project_name,
            "image_name": image_tag,
            "port": 80,
            "domain": f"{project_name}.unideploy.io"
        }
        await deploy_agent.run(project_data)
        
        # 3. Success
        db_deploy.status = "live"
        db_deploy.domain = project_data["domain"]
        
        # Update project state
        StateMachine.validate_transition(project.status, "RUNNING")
        project.status = "RUNNING"
        project.last_active_at = datetime.utcnow()
        db.commit()
        log_intent(project.id, 1, "DEPLOY", "SUCCESS")
        
        await notify_agent.broadcast_status(str(deployment_id), {
            "status": "live", 
            "domain": project_data["domain"],
            "message": "Deployment is live!"
        })
        
    except Exception as e:
        print(f"[Core] Pipeline failed for {deployment_id}: {e}")
        db_deploy = db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
        if db_deploy:
            db_deploy.status = "failed"
            db_deploy.logs = {"error": str(e)}
            db.commit()
        await notify_agent.broadcast_status(str(deployment_id), {"status": "failed", "error": str(e)})
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
async def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(name=project.name, owner_id=1) # Hardcoded owner for now
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
        effective_status = StateAuthority.get_effective_state(p, deploy_agent.manager.k8s_client)
        if p.status != effective_status and p.status not in ["WAKING", "CREATED"]:
             p.status = effective_status
    return db_projects

@app.post("/analyze")
async def analyze_repo(repo_url: str, bg_tasks: BackgroundTasks, user=Depends(get_current_user)):
    """
    Triggers the Smart Analysis for a GitHub Repo.
    """
    print(f"[API] Analyze requested for {repo_url} by {user['username']}")
    # Call agent directly for now, usually async
    result = await analyzer_agent.analyze(repo_url, user['id'])
    return result

@app.post("/projects/{project_id}/start")
async def start_project(project_id: int, db: Session = Depends(get_db)):
    # 1. Acquire Lock & Fetch
    project = db.query(models.Project).filter(models.Project.id == project_id).with_for_update().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.is_locked:
        raise HTTPException(status_code=409, detail="Project action already in progress")

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

        # Call K8s (or Mock in Sandbox)
        success = deploy_agent.manager.scale_deployment(project.name, replicas=1)
        if not success:
            raise Exception("K8s scaling failed")

        StateMachine.validate_transition(project.status, "RUNNING")
        project.status = "RUNNING"
        project.last_active_at = datetime.utcnow()
        project.is_locked = 0
        db.commit()
        log_intent(project_id, 1, "START", "SUCCESS")
        return {"status": "RUNNING", "message": "Project started"}
    except Exception as e:
        db.rollback()
        # Rollback state
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        project.status = original_status
        project.is_locked = 0
        db.commit()
        log_intent(project_id, 1, "START", "FAILED", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start: {e}")

@app.post("/deploy/{project_id}")
async def trigger_deploy(project_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
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
    os.makedirs(f"temp/{db_deploy.id}", exist_ok=True)
    temp_path = f"temp/{db_deploy.id}/source.zip"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    project_path = f"temp/{db_deploy.id}" 
    
    from database import SessionLocal
    background_tasks.add_task(run_deployment_pipeline, db_deploy.id, project_path, project.name, SessionLocal())
    
    return {"deployment_id": db_deploy.id, "status": "queued"}

@app.get("/deployments/{deployment_id}", response_model=schemas.Deployment)
async def get_deployment_status(deployment_id: int, db: Session = Depends(get_db)):
    db_deploy = db.query(models.Deployment).filter(models.Deployment.id == deployment_id).first()
    if not db_deploy:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return db_deploy

@app.post("/projects/{project_id}/stop")
async def stop_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).with_for_update().first()
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

        success = deploy_agent.manager.scale_deployment(project.name, replicas=0)
        if not success:
            raise Exception("K8s scaling failed")

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
    return {"status": "online", "service": "UniDeploy Backend"}

@app.get("/system/config")
async def get_system_config():
    return {
        "read_only": SystemGuard.is_read_only(),
        "maintenance": SystemGuard.is_read_only(),
        "daily_limit_mins": int(os.getenv("DAILY_RUNTIME_LIMIT_MINS", 60))
    }
