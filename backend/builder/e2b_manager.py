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
            sbx = Sandbox() # Uses default code-interpreter template
            
            # 2. Clone Repo
            print(f"[E2BManager] Cloning {repo_url}...")
            sbx.process.start_and_wait(f"git clone {repo_url} /home/user/project")
            
            # 3. Install/Build
            if build_command:
                print(f"[E2BManager] Building: {build_command}")
                # We assume cwd is /home/user/project
                sbx.process.start_and_wait(f"cd /home/user/project && {build_command}")
            
            # 4. Start Server (Background)
            if start_command:
                print(f"[E2BManager] Starting: {start_command}")
                # We use start() instead of start_and_wait() to keep it running
                # We need to expose port 3000/8080. E2B does this automatically if process binds to it.
                server = sbx.process.start(f"cd /home/user/project && {start_command}")
                
            # 5. Get Public URL
            # E2B automatically tunnels standard ports. Let's find the host.
            # For this MVP, we return the sandbox ID which the frontend can potentially use 
            # or we construct the URL pattern: https://<port>-<id>.e2b.dev
            
            # NOTE: E2B Code Interpreter creates a temporary session. 
            # For persistent "Deployment", we might need to keep this instance alive 
            # or use logic to "wake" it. 
            # Ideally, we return the Sandbox ID so the frontend can keep it alive.
            
            return {
                "id": sbx.id,
                "status": "running",
                # Simple heuristic for URL (port 8080 default)
                "url": f"https://8080-{sbx.id}.e2b.dev" 
            }
            
        except Exception as e:
            print(f"[E2BManager] Failed to create sandbox: {e}")
            return None

    def kill_sandbox(self, sandbox_id):
        # E2B Sandboxes auto-die after timeout, but we can kill explicitly if we stored the object
        # With the SDK, we typically need the instance. 
        # For now, we rely on E2B's auto-timeout for Scale-to-Zero.
        pass
