"""
Prefect durable deployment pipeline.

Replaces the in-memory `run_deployment_pipeline` coroutine in main.py with
retryable Prefect tasks + a top-level flow. Prefect runs in-process (no
separate server required); state is persisted to local SQLite via PREFECT_HOME.
"""
from __future__ import annotations

import os
from datetime import datetime

from prefect import flow, task


# ---------------------------------------------------------------------------
# Retryable tasks
# ---------------------------------------------------------------------------

@task(retries=3, retry_delay_seconds=10, name="clone_repository")
async def clone_repository(repo_url: str, dest_dir: str) -> str:
    """Git-clone *repo_url* into *dest_dir*. Returns the dest path."""
    from git import Repo

    os.makedirs(dest_dir, exist_ok=True)
    Repo.clone_from(repo_url, dest_dir)
    print(f"[Orchestrator] Cloned {repo_url} → {dest_dir}")
    return dest_dir


@task(retries=3, retry_delay_seconds=15, name="provision_e2b_sandbox")
async def provision_e2b_sandbox(project_data: dict) -> dict:
    """Provision an E2B sandbox and return the deployment result dict."""
    from agents.deploy_agent import DeployAgent

    agent = DeployAgent()
    result = await agent.run(project_data)
    return result


# ---------------------------------------------------------------------------
# Top-level flow
# ---------------------------------------------------------------------------

@flow(name="deployment_flow", log_prints=True)
async def deployment_flow(
    deployment_id: int,
    project_name: str,
    repo_url: str | None = None,
    project_path: str | None = None,
) -> None:
    """
    Full deployment pipeline as a Prefect flow.

    Steps:
      1. (Optional) Clone repository
      2. Detect build config via BuildAgent
      3. Provision E2B sandbox via DeployAgent
      4. Persist result and broadcast WebSocket status
    """
    from agents.build_agent import BuildAgent
    from agents.notify_agent import get_notify_agent
    from database import SessionLocal
    from guards import StateMachine
    from logging_utils import log_intent
    from utils.cost_manager import CostManager
    import models

    notify = get_notify_agent()
    db = SessionLocal()

    try:
        # --- 1. Clone ---
        if repo_url:
            work_dir = f"/tmp/unideploy/{deployment_id}"
            await notify.broadcast_status(
                str(deployment_id),
                {"status": "cloning", "message": f"Cloning {repo_url}..."},
            )
            project_path = await clone_repository(repo_url, work_dir)

        # --- 2. Build detection ---
        await notify.broadcast_status(
            str(deployment_id),
            {"status": "building", "message": "Detecting project configuration..."},
        )

        build_agent = BuildAgent()

        async def _build_log(msg: str) -> None:
            await notify.broadcast_status(
                str(deployment_id), {"status": "building", "log": msg}
            )

        build_config = await build_agent.run(
            project_path, project_name, log_callback=_build_log
        )

        db_deploy = (
            db.query(models.Deployment)
            .filter(models.Deployment.id == deployment_id)
            .first()
        )
        db_deploy.status = "deploying"

        project = (
            db.query(models.Project)
            .filter(models.Project.id == db_deploy.project_id)
            .first()
        )

        # --- 3. E2B provision ---
        await notify.broadcast_status(
            str(deployment_id),
            {"status": "deploying", "message": "Configuration detected. Starting E2B sandbox..."},
        )

        project_data = {
            "id": project.id,
            "project_name": project.name,
            "repo_url": repo_url,
            "build_command": build_config.get("build_command"),
            "start_command": build_config.get("start_command"),
            "port": build_config.get("port", 3000),
            "tier": project.tier or "SEED",
            "env_vars": project.env_vars or {},
        }

        deployment_res = await provision_e2b_sandbox(project_data)

        # --- 4. Persist result ---
        if deployment_res and deployment_res["status"] == "live":
            db_deploy.status = "live"
            db_deploy.sandbox_id = deployment_res["sandbox_id"]
            db_deploy.sandbox_url = deployment_res["url"]
            db_deploy.domain = (
                f"{project.name.lower().replace(' ', '-')}.app.unideploy.in"
            )

            StateMachine.validate_transition(project.status, "RUNNING")
            project.status = "RUNNING"
            project.last_active_at = datetime.utcnow()
            db.commit()
            log_intent(project.id, 1, "DEPLOY", "SUCCESS")

            await notify.broadcast_status(
                str(deployment_id),
                {
                    "status": "live",
                    "domain": db_deploy.domain,
                    "sandboxUrl": deployment_res["url"],
                    "message": "Deployment is live!",
                },
            )

            CostManager().log_sandbox_usage(
                deployment_res["sandbox_id"], duration_seconds=60, tier=project.tier
            )

    except Exception as e:
        print(f"[Orchestrator] Pipeline failed for deployment {deployment_id}: {e}")
        db_deploy = (
            db.query(models.Deployment)
            .filter(models.Deployment.id == deployment_id)
            .first()
        )
        if db_deploy:
            db_deploy.status = "failed"
            db_deploy.error_message = str(e)
            db.commit()

        await notify.broadcast_status(
            str(deployment_id),
            {
                "status": "failed",
                "error": f"Deployment failed: {str(e)}",
                "message": f"Deployment failed: {str(e)}",
            },
        )
    finally:
        db.close()
