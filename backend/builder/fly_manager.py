import os
import requests
import time
import json

class FlyManager:
    """
    Manages Fly.io Machines for Sandbox Environments.
    Uses the Machines API: https://fly.io/docs/machines/api/
    """
    API_URL = "https://api.machines.dev/v1"

    def __init__(self):
        self.api_key = os.getenv("FLY_API_KEY")
        self.org_slug = os.getenv("FLY_ORG_SLUG", "personal")
        self.app_name_prefix = os.getenv("FLY_APP_PREFIX", "unideploy-sandbox")
        
        if not self.api_key:
            print("[FlyManager] Warning: FLY_API_KEY not set.")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def create_sandbox(self, project_id: str, image: str = "flyio/hellofly:latest"):
        """
        Provisions a new Fly Machine for a project.
        """
        app_name = f"{self.app_name_prefix}-{project_id}"
        
        # 1. Ensure App Exists
        self._ensure_app_exists(app_name)

        # 2. Create Machine
        url = f"{self.API_URL}/apps/{app_name}/machines"
        payload = {
            "config": {
                "image": image,
                "guest": {
                    "cpu_kind": "shared",
                    "cpus": 1,
                    "memory_mb": 256 # Cheap!
                },
                "services": [
                    {
                        "protocol": "tcp",
                        "internal_port": 8080,
                        "ports": [
                            {"port": 80, "handlers": ["http"]},
                            {"port": 443, "handlers": ["tls", "http"]}
                        ]
                    }
                ]
            },
            "region": "iad" # Default region
        }
        
        try:
            res = requests.post(url, json=payload, headers=self._headers())
            res.raise_for_status()
            machine = res.json()
            print(f"[FlyManager] Created machine {machine['id']} for {app_name}")
            return machine
        except Exception as e:
            print(f"[FlyManager] Failed to create machine: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            return None

    def _ensure_app_exists(self, app_name: str):
        # Check if app exists, if not create it
        url = f"{self.API_URL}/apps/{app_name}"
        res = requests.get(url, headers=self._headers())
        
        if res.status_code == 404:
            # Create App
            create_url = f"{self.API_URL}/apps"
            payload = {"app_name": app_name, "org_slug": self.org_slug}
            requests.post(create_url, json=payload, headers=self._headers())
            print(f"[FlyManager] Created app {app_name}")

    def stop_machine(self, app_name: str, machine_id: str):
        url = f"{self.API_URL}/apps/{app_name}/machines/{machine_id}/stop"
        try:
            requests.post(url, headers=self._headers())
            print(f"[FlyManager] Stopped machine {machine_id}")
            return True
        except Exception as e:
            print(f"[FlyManager] Stop failed: {e}")
            return False

    def start_machine(self, app_name: str, machine_id: str):
        url = f"{self.API_URL}/apps/{app_name}/machines/{machine_id}/start"
        try:
            requests.post(url, headers=self._headers())
            print(f"[FlyManager] Started machine {machine_id}")
            return True
        except Exception as e:
            print(f"[FlyManager] Start failed: {e}")
            return False

    def destroy_sandbox(self, app_name: str, machine_id: str):
        # Stop first
        self.stop_machine(app_name, machine_id)
        # Wait a bit?
        time.sleep(2)
        
        url = f"{self.API_URL}/apps/{app_name}/machines/{machine_id}"
        try:
            requests.delete(url, headers=self._headers())
            print(f"[FlyManager] Destroyed machine {machine_id}")
            return True
        except Exception as e:
            print(f"[FlyManager] Destroy failed: {e}")
            return False
