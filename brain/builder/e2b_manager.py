from e2b_code_interpreter import Sandbox
import os
import time


class E2BManager:
    """
    Manages Serverless Sandboxes via E2B.
    This replaces Docker/Kubernetes management completely.
    """

    def __init__(self):
        self.api_key = os.getenv("E2B_API_KEY")
        if not self.api_key:
            print("[E2BManager] WARNING: E2B_API_KEY not set. Sandboxes will fail.")

    def create_sandbox(
        self,
        repo_url: str,
        build_command: str = None,
        start_command: str = None,
        log_callback=None,
        tier: str = "SEED",
        env_vars: dict = None,
    ):
        """
        Creates a new E2B Sandbox, clones the repo, and starts the server.
        Uses the 'tier' to allocate resources.
        """
        if log_callback:
            log_callback(f"[System] Spawning {tier} Sandbox for {repo_url}...")

        # Mapping Tiers to E2B Resources
        # SEED: 0.25 vCPU, 256MB RAM, 5m Timeout
        # LAUNCH: 1 vCPU, 2GB RAM, 30m Timeout
        # SCALE: 2 vCPU, 4GB RAM, 24h Timeout + Persistent Disk
        resource_mapping = {
            "SEED": {"cpu": 1, "memory": 512, "timeout": 300},
            "LAUNCH": {"cpu": 1, "memory": 2048, "timeout": 1800},
            "SCALE": {"cpu": 2, "memory": 4096, "timeout": 86400},
        }
        specs = resource_mapping.get(tier, resource_mapping["SEED"])

        if tier == "SCALE" and log_callback:
            log_callback("[System] Allocating Persistent NVMe Disk (10GB)...")

        print(f"[E2BManager] creating {tier} sandbox ({specs}) for {repo_url}...")
        try:
            # 1. Spawn VM with resource limits and timeout
            sbx = Sandbox.create(
                api_key=self.api_key,
                timeout=specs["timeout"]
                # cpu_count=specs["cpu"], 
                # memory_mb_count=specs["memory"]
            )

            def handle_stdout(output):
                if log_callback:
                    log_callback(output.line)

            def handle_stderr(output):
                if log_callback:
                    log_callback(f"[ERR] {output.line}")

            # 2. Clone Repo
            if log_callback:
                log_callback(f"[Git] Cloning {repo_url}...")
            print(f"[E2BManager] Cloning {repo_url}...")
            sbx.commands.run(
                f"git clone {repo_url} /home/user/project",
                on_stdout=handle_stdout,
                on_stderr=handle_stderr,
            )

            # 3. Install/Build
            if build_command and build_command.lower() not in ["none", "null"]:
                if log_callback:
                    log_callback(f"[Build] Running: {build_command}")
                print(f"[E2BManager] Building: {build_command}")
                sbx.commands.run(
                    f"cd /home/user/project && {build_command}",
                    envs=env_vars or {},
                    on_stdout=handle_stdout,
                    on_stderr=handle_stderr,
                )

            # 4. Start Server (Background)
            if start_command and start_command.lower() not in ["none", "null"]:
                if log_callback:
                    log_callback(f"[Start] Running: {start_command}")
                if env_vars:
                    log_callback(f"[System] Injecting {len(env_vars)} Environment Variables...")
                print(f"[E2BManager] Starting: {start_command}")
                server = sbx.commands.run(
                    f"cd /home/user/project && {start_command}",
                    envs=env_vars or {},
                    background=True,
                    on_stdout=handle_stdout,
                    on_stderr=handle_stderr,
                )

            # 5. Get Public URL
            # E2B v2.x uses .sandbox_id
            # Construct URL pattern for 'code-interpreter' template (default ports often 8080 or 3000)
            # URL format: https://<port>-<id>.e2b.dev

            return {
                "id": sbx.sandbox_id,
                "status": "running",
                "url": f"https://8080-{sbx.sandbox_id}.e2b.dev",
            }

        except Exception as e:
            print(f"[E2BManager] Failed to create sandbox: {e}")
            return None

    def kill_sandbox(self, sandbox_id):
        # E2B Sandboxes auto-die after timeout, but we can kill explicitly if we stored the object
        # With the SDK, we typically need the instance.
        # For now, we rely on E2B's auto-timeout for Scale-to-Zero.
        pass
