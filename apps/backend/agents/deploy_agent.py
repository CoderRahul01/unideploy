from builder.e2b_manager import E2BManager


class DeployAgent:
    def __init__(self):
        self.e2b = E2BManager()

    async def run(self, project_data):
        """
        Deploys project to an E2B Sandbox (Serverless).
        """
        print(f"[DeployAgent] Provisioning E2B Sandbox for: {project_data['project_name']}")

        build_cmd = project_data.get("build_command")
        start_cmd = project_data.get("start_command", "echo 'No Start Cmd'")
        port = project_data.get("port", 3000)
        tier = project_data.get("tier", "SEED")
        env_vars = project_data.get("env_vars", {})
        repo_url = project_data.get("repo_url")

        def log_callback(log_line: str):
            print(f"[DeployAgent] {log_line}")

        sandbox = self.e2b.create_sandbox(
            repo_url=repo_url,
            build_command=build_cmd,
            start_command=start_cmd,
            log_callback=log_callback,
            tier=tier,
            env_vars=env_vars,
            port=port,
        )

        if not sandbox:
            raise Exception("Failed to create E2B Sandbox")

        print(f"[DeployAgent] Sandbox Active: {sandbox['url']}")

        return {
            "status": "live",
            "url": sandbox["url"],
            "sandbox_id": sandbox["id"],
        }

    async def stop(self, sandbox_id):
        """Kills the E2B sandbox."""
        return self.e2b.kill_sandbox(sandbox_id)
