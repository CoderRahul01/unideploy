import os
import datetime
from sqlalchemy.orm import Session
from kubernetes import client
import models


class StateMachine:
    """
    The canonical laws of status transitions.
    """

    ALLOWED_TRANSITIONS = {
        "CREATED": ["BUILT"],
        "BUILT": ["WAKING", "RUNNING"],
        "WAKING": ["RUNNING", "SLEEPING"],
        "RUNNING": ["SLEEPING"],
        "SLEEPING": ["WAKING"],
    }

    @staticmethod
    def validate_transition(current: str, target: str):
        if current == target:
            return
        if target not in StateMachine.ALLOWED_TRANSITIONS.get(current, []):
            raise ValueError(f"Illegal status transition: {current} -> {target}")


class StateAuthority:
    @staticmethod
    def get_effective_state(
        project: models.Project, k8s_client: client.ApiClient
    ) -> str:
        """
        Kubernetes is the source of truth for RUNNING vs NOT RUNNING.
        In SANDBOX mode (k8s_client is None), we trust the DB.
        """
        # Sandbox Mode / Mock check
        if k8s_client is None:
            return project.status

        # If project hasn't been built yet, it's CREATED
        if project.status == "CREATED":
            return "CREATED"

        # Check K8s for actual pod status
        try:
            v1 = client.CoreV1Api(k8s_client)
            # Find pods with app label
            pods = v1.list_namespaced_pod(
                namespace="default", label_selector=f"app={project.name}"
            ).items

            is_running = any(p.status.phase == "Running" for p in pods)

            if is_running:
                return "RUNNING"

            # If DB says WAKING but no pod is running yet, respect the intent
            if project.status == "WAKING":
                return "WAKING"

            # If DB says BUILT or SLEEPING and no pod is running, it's SLEEPING/BUILT
            return (
                project.status
                if project.status in ["SLEEPING", "BUILT"]
                else "SLEEPING"
            )

        except Exception as e:
            print(f"[StateAuthority] Error querying K8s: {e}")
            # Fallback to DB state if K8s is unreachable
            return project.status


class SystemGuard:
    @staticmethod
    def is_read_only() -> bool:
        return os.getenv("UNIDEPLOY_READ_ONLY", "false").lower() == "true"

    @staticmethod
    def can_start_project(project: models.Project, db: Session) -> (bool, str):
        """
        Centrally enforces all safety invariants before a project can scale up.
        """
        if SystemGuard.is_read_only():
            return False, "Platform is in READ-ONLY mode for maintenance."

        PLATFORM_MAX_PODS = int(os.getenv("PLATFORM_MAX_PODS", 40))
        DAILY_RUNTIME_LIMIT_MINS = int(os.getenv("DAILY_RUNTIME_LIMIT_MINS", 60))

        # 1. Daily Runtime Check
        if project.daily_runtime_minutes >= DAILY_RUNTIME_LIMIT_MINS:
            return (
                False,
                f"Daily runtime limit reached ({DAILY_RUNTIME_LIMIT_MINS}m). Resets tomorrow.",
            )

        # 2. Global Safety Limit Check
        running_pods = (
            db.query(models.Project).filter(models.Project.status == "RUNNING").count()
        )
        if running_pods >= PLATFORM_MAX_PODS:
            return False, "Platform capacity reached. Please try again later."

        # 3. User Concurrency Check (Free Tier: 1 app)
        user_running = (
            db.query(models.Project)
            .filter(
                models.Project.owner_id == project.owner_id,
                models.Project.status == "RUNNING",
            )
            .count()
        )
        if user_running >= 1:
            return False, "Free tier limit: Only 1 project can run at a time."

        return True, "OK"

    @staticmethod
    def can_build_project(db: Session) -> (bool, str):
        if SystemGuard.is_read_only():
            return False, "Platform is in READ-ONLY mode for maintenance."

        MAX_CONCURRENT_BUILDS = int(os.getenv("MAX_CONCURRENT_BUILDS", 5))
        building_count = (
            db.query(models.Deployment)
            .filter(models.Deployment.status == "building")
            .count()
        )
        if building_count >= MAX_CONCURRENT_BUILDS:
            return (
                False,
                "Platform build capacity reached. Please try again in a few minutes.",
            )
        return True, "OK"

    @staticmethod
    def validate_upload(file_size: int) -> (bool, str):
        MAX_ZIP_SIZE = 10 * 1024 * 1024
        if file_size > MAX_ZIP_SIZE:
            return False, "Project zip file is too large. Max 10MB allowed."
        return True, "OK"

    @staticmethod
    def check_invariants(project: models.Project, db: Session):
        """
        Hard invariants that must NEVER fail.
        """
        DAILY_LIMIT = int(os.getenv("DAILY_RUNTIME_LIMIT_MINS", 60))

        # 1. Runtime Invariant
        assert (
            project.daily_runtime_minutes <= DAILY_LIMIT + 5
        ), f"CRITICAL: {project.name} exceeded daily limit significantly!"

        # 2. Concurrency Invariant (Free Tier)
        user_running = (
            db.query(models.Project)
            .filter(
                models.Project.owner_id == project.owner_id,
                models.Project.status == "RUNNING",
            )
            .count()
        )
        # Allow 1 (self) but not more
        assert (
            user_running <= 1
        ), f"CRITICAL: User {project.owner_id} has multiple running projects!"
