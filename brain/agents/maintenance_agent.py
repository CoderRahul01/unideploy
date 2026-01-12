import asyncio
import requests
import time
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas
from agents.deploy_agent import DeployAgent

class MaintenanceAgent:
    """
    Background worker that monitors deployment health and auto-recovers failed services.
    """

    def __init__(self):
        self.deploy_agent = DeployAgent()

    async def run_forever(self):
        """
        Main loop for health monitoring.
        """
        print("[MaintenanceAgent] Starting background health monitoring...")
        while True:
            try:
                await self.check_all_deployments()
            except Exception as e:
                print(f"[MaintenanceAgent] Error in maintenance loop: {e}")
            
            # Sleep for 5 minutes between checks
            await asyncio.sleep(300)

    async def check_all_deployments(self):
        """
        Checks every LIVE deployment.
        """
        db = SessionLocal()
        try:
            live_deployments = db.query(models.Deployment).filter(models.Deployment.status == "live").all()
            print(f"[MaintenanceAgent] Checking {len(live_deployments)} active deployments...")

            for deploy in live_deployments:
                if not deploy.domain:
                    continue
                
                is_healthy = self.ping_deployment(deploy.domain)
                
                if not is_healthy:
                    print(f"[MaintenanceAgent] ALERT: Deployment {deploy.id} ({deploy.domain}) is UNHEALTHY. Initiating recovery...")
                    await self.recover_deployment(deploy, db)
        
        finally:
            db.close()

    def ping_deployment(self, url: str):
        """
        Pings the deployment URL to check if it's responsive.
        """
        try:
            # Add protocol if missing
            full_url = url if url.startswith("http") else f"https://{url}"
            # construct E2B style URL if needed, but we store the full URL usually
            
            response = requests.get(full_url, timeout=5)
            return response.status_code < 500
        except Exception:
            return False

    async def recover_deployment(self, deploy: models.Deployment, db: Session):
        """
        Restarts the deployment logic.
        """
        project = deploy.project
        if not project:
            return

        print(f"[MaintenanceAgent] Recovering project {project.name}...")
        
        # In a real app, we might check if it's a transient failure first.
        # But for UniDeploy, we trigger a fresh sandbox provision.
        
        project_data = {
            "id": project.id,
            "project_name": project.name,
            "repo_url": project.git_url, # Need to ensure this is stored/available
            "port": project.port or 80,
            "tier": project.tier or "SEED",
            "env_vars": project.env_vars or {},
        }

        try:
            # We don't bother with the build phase if the image is cached, 
            # but E2B sandboxes are created from scratch.
            # So we re-run the full deploy agent.
            new_deployment = await self.deploy_agent.run(project_data)
            
            if new_deployment and new_deployment["status"] == "live":
                deploy.domain = new_deployment["url"]
                deploy.sandbox_id = new_deployment["sandbox_id"]
                db.commit()
                print(f"[MaintenanceAgent] SUCCESS: Recovery complete for {project.name}. New URL: {new_deployment['url']}")
        except Exception as e:
            print(f"[MaintenanceAgent] FAILED: Recovery failed for {project.name}: {e}")
