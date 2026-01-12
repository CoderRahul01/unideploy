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
    ):
        """
        Creates a new E2B Sandbox, clones the repo, and starts the server.
        """
        if log_callback:
            log_callback(f"[System] Spawning Sandbox for {repo_url}...")

        print(f"[E2BManager] creating sandbox for {repo_url}...")
        try:
            # 1. Spawn VM
            sbx = Sandbox.create(api_key=self.api_key)

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
                    on_stdout=handle_stdout,
                    on_stderr=handle_stderr,
                )

            # 4. Start Server (Background)
            if start_command and start_command.lower() not in ["none", "null"]:
                if log_callback:
                    log_callback(f"[Start] Running: {start_command}")
                print(f"[E2BManager] Starting: {start_command}")
                server = sbx.commands.run(
                    f"cd /home/user/project && {start_command}",
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
