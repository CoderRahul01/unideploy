from builder.e2b_manager import E2BManager
import time
import os
import requests


class DeployAgent:
    def __init__(self):
        self.e2b = E2BManager()

    async def run(self, project_data):
        """
        Deploys project to an E2B Sandbox (Serverless).
        """
        print(
            f"[DeployAgent] Provisioning E2B Sandbox for: {project_data['project_name']}"
        )

        try:
            p_id = str(project_data["id"])
            repo_url = project_data.get("repo_url")

            # 1. Create Log Callback
            gateway_url = os.getenv("GATEWAY_URL", "http://localhost:3001")
            
            def log_callback(log_line: str):
                try:
                    requests.post(
                        f"{gateway_url}/internal/logs",
                        json={"deploymentId": p_id, "log": log_line},
                        timeout=2
                    )
                except Exception as e:
                    print(f"[DeployAgent] Failed to send log: {e}")

            # 2. Create Sandbox
            # We pass build/start commands if available
            build_cmd = project_data.get("build_command")
            start_cmd = project_data.get("start_command", "echo 'No Start Cmd'")
            tier = project_data.get("tier", "SEED")
            env_vars = project_data.get("env_vars", {})

            sandbox = self.e2b.create_sandbox(
                repo_url=repo_url, 
                build_command=build_cmd, 
                start_command=start_cmd,
                log_callback=log_callback,
                tier=tier,
                env_vars=env_vars
            )

            if not sandbox:
                raise Exception("Failed to create E2B Sandbox")
            
            log_callback(f"[System] Sandbox Ready: {sandbox['url']}")
            print(f"[DeployAgent] Sandbox Active: {sandbox['url']}")

            return {
                "status": "live",
                "url": sandbox["url"],
                "sandbox_id": sandbox["id"],
            }

        except Exception as e:
            print(f"[DeployAgent] Deployment failed: {e}")
            raise e
