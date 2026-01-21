import asyncio
import datetime
import os
import sys

# Add backend to path to import models and db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from builder.k8s_manager import K8sManager
from kubernetes import client


async def maintenance_worker():
    """
    Background worker that:
    1. Tracks and increments runtime for RUNNING projects.
    2. Enforces auto-sleep for idle projects.
    3. Resets daily runtime counters every 24h.
    4. Reconciles DB status with actual K8s pod status.
    """
    print("[Maintenance] Starting worker...")
    k8s_manager = K8sManager()

    while True:
        db = SessionLocal()
        try:
            now = datetime.datetime.utcnow()

            # 1. State Reconciliation & Runtime Tracking
            # Fetch projects with locks and in-flight states excluded
            projects = db.query(models.Project).all()

            # Get actual running pods from K8s to reconcile
            try:
                v1 = client.CoreV1Api(k8s_manager.k8s_client)
                pods = v1.list_pod_for_all_namespaces(label_selector="app").items
                active_pod_names = [
                    p.metadata.labels.get("app")
                    for p in pods
                    if p.status.phase == "Running"
                ]
            except Exception as e:
                print(f"[Maintenance] K8s API error: {e}")
                active_pod_names = []

            for project in projects:
                # SKIP if project is locked (under mutation) or already in flux
                if project.is_locked or project.status == "WAKING":
                    continue

                # RECONCILE: Reality Check
                effective_status = project.status
                if project.name in active_pod_names:
                    effective_status = "RUNNING"
                elif project.status not in ["CREATED", "BUILT"]:
                    effective_status = "SLEEPING"

                # If drift detected, sync DB (only for non-locked projects)
                if project.status != effective_status:
                    print(
                        f"[Maintenance] Syncing {project.name}: {project.status} -> {effective_status}"
                    )
                    project.status = effective_status
                    db.commit()

                # RUNTIME TRACKING: Only if actually verified running
                if project.status == "RUNNING" and project.name in active_pod_names:
                    # Increment runtime safely
                    increment = 2  # 2 min tick
                    project.daily_runtime_minutes += increment
                    project.total_runtime_minutes += increment

                    # Hard Invariant: Stop if over limit
                    limit = int(os.getenv("DAILY_RUNTIME_LIMIT_MINS", 60))
                    if project.daily_runtime_minutes >= limit:
                        print(f"[Maintenance] Limit Reached: {project.name}")
                        try:
                            k8s_manager.scale_deployment(project.name, replicas=0)
                            project.status = "SLEEPING"
                        except Exception as scale_err:
                            print(f"[Maintenance] Failed scale-down: {scale_err}")

                    db.commit()

                # AUTO-SLEEP (based on inactivity)
                if project.status == "RUNNING":
                    idle_duration = now - project.last_active_at
                    if idle_duration.total_seconds() > 15 * 60:
                        print(f"[Maintenance] Idle Timeout: {project.name}")
                        try:
                            k8s_manager.scale_deployment(project.name, replicas=0)
                            project.status = "SLEEPING"
                            db.commit()
                        except Exception as e:
                            print(f"[Maintenance] Sleep error: {e}")

            # --- 2. Daily Runtime Reset ---
            # Reset if last reset was more than 24h ago
            projects_to_reset = (
                db.query(models.Project)
                .filter(models.Project.last_reset_at < now - datetime.timedelta(days=1))
                .all()
            )
            for p in projects_to_reset:
                print(f"[Maintenance] Daily Reset for {p.name}")
                p.daily_runtime_minutes = 0
                p.last_reset_at = now
            db.commit()

        except Exception as e:
            print(f"[Maintenance] Error in worker loop: {e}")
        finally:
            db.close()

        # Run every 2 minutes
        await asyncio.sleep(120)


if __name__ == "__main__":
    asyncio.run(maintenance_worker())
