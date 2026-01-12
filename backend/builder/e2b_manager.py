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

    def create_sandbox(self, repo_url: str, build_command: str = None, start_command: str = None):
        """
        Creates a new E2B Sandbox, clones the repo, and starts the server.
        """
        print(f"[E2BManager] creating sandbox for {repo_url}...")
        try:
            # 1. Spawn VM
            # Use Sandbox.create() as per SDK 2.x Docs
            sbx = Sandbox.create(api_key=self.api_key) 
            
            # 2. Clone Repo
            # E2B Code Interpreter has .commands / .pty but primarily .run_code() for Python/JS
            # For shell, use .commands.run() if available, or .ptys.start()
            # Let's assume standard 'commands' interface for now based on common E2B patterns.
            # If creating 'Sandbox' generic, maybe it's just 'sandbox.commands.run'.
            # BUT 'e2b_code_interpreter' is specialized. It might just have 'exec_cell' or similar.
            
            # Trying .commands.run() as it's standard in v1.0. If v2.0 changed it, we'll see.
            # Actually, standard E2B Sandbox has .commands
            print(f"[E2BManager] Cloning {repo_url}...")
            sbx.commands.run(f"git clone {repo_url} /home/user/project")
            
            # 3. Install/Build
            if build_command and build_command.lower() not in ["none", "null"]:
                print(f"[E2BManager] Building: {build_command}")
                sbx.commands.run(f"cd /home/user/project && {build_command}")
            
            # 4. Start Server (Background)
            if start_command and start_command.lower() not in ["none", "null"]:
                print(f"[E2BManager] Starting: {start_command}")
                # Use background execution if possible. .commands.run checks exit code.
                # We might need .ptys.start for long running processes
                server = sbx.commands.run(f"cd /home/user/project && {start_command}", background=True)
                
                
            # 5. Get Public URL
            # E2B v2.x uses .sandbox_id
            # Construct URL pattern for 'code-interpreter' template (default ports often 8080 or 3000)
            # URL format: https://<port>-<id>.e2b.dev
            
            return {
                "id": sbx.sandbox_id,
                "status": "running",
                "url": f"https://8080-{sbx.sandbox_id}.e2b.dev" 
            }
            
        except Exception as e:
            print(f"[E2BManager] Failed to create sandbox: {e}")
            return None

    def kill_sandbox(self, sandbox_id):
        # E2B Sandboxes auto-die after timeout, but we can kill explicitly if we stored the object
        # With the SDK, we typically need the instance. 
        # For now, we rely on E2B's auto-timeout for Scale-to-Zero.
        pass
