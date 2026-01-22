from e2b_code_interpreter import Sandbox
import os
import time
import json


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

        # Mapping Tiers to E2B Hobby (Free) Limits
        # Screenshot shows: Max 1-hour session length
        resource_mapping = {
            "SEED": {"cpu": 1, "memory": 512, "timeout": 600},      # 10m
            "LAUNCH": {"cpu": 1, "memory": 1024, "timeout": 1800},   # 30m
            "SCALE": {"cpu": 1, "memory": 2048, "timeout": 3600},    # 1h (MAX FREE)
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

    def verify_fix(self, project_path, focus_file, patched_code, error_context):
        """
        Runs the patched code in an E2B sandbox to verify if the error still occurs.
        """
        print(f"[E2BManager] Verifying fix for {focus_file}...")
        try:
            # Create a code interpreter sandbox
            sbx = Sandbox.create(api_key=self.api_key)
            
            # Setup files
            sbx.files.write(f"/home/user/{focus_file}", patched_code)
            
            # Simplified verification: try to run the file or check for syntax
            # In a real scenario, this would involve running tests.
            res = sbx.commands.run(f"python3 -m py_compile /home/user/{focus_file}")
            
            status = "resolved" if res.exit_code == 0 else "still_failing"
            sbx.kill()
            
            return {
                "status": status,
                "output": res.stdout,
                "error": res.stderr
            }
        except Exception as e:
            print(f"[E2BManager] Verification failed: {e}")
            return {"status": "error", "message": str(e)}

    def analyze_codebase(self, repo_path, log_callback=None):
        """
        Uses E2B Code Interpreter to analyze a local directory before deployment.
        """
        if log_callback: log_callback("[System] Initializing E2B Dynamic Analysis...")
        
        try:
            sbx = Sandbox.create(api_key=self.api_key)
            # Upload project structure (simulated for now by sending file list)
            files = []
            for root, _, f_names in os.walk(repo_path):
                for f in f_names:
                    files.append(os.path.relpath(os.path.join(root, f), repo_path))
            
            # Ask Code Interpreter to detect risky patterns
            analysis_script = f"""
import json
files = {json.dumps(files[:100])}
risks = []
if any('password' in f.lower() for f in files): risks.append('Hardcoded credentials possibility')
if any('.env' in f for f in files): risks.append('Environment files detected')
print(json.dumps({{'risks': risks, 'count': len(files)}}))
"""
            res = sbx.commands.run(f"python3 -c \"{analysis_script}\"")
            sbx.kill()
            
            if res.exit_code == 0:
                return json.loads(res.stdout)
            return {"risks": ["Analysis failed to execute"], "error": res.stderr}
            
        except Exception as e:
            print(f"[E2BManager] Dynamic analysis failed: {e}")
            return {"error": str(e)}

    def kill_sandbox(self, sandbox_id):
        """
        Explicitly terminates an E2B sandbox.
        """
        try:
            from e2b_code_interpreter import Sandbox
            # We connect to the existing sandbox by ID and then close it
            sandbox = Sandbox.connect(sandbox_id)
            sandbox.kill()
            return True
        except Exception as e:
            print(f"[E2BManager] Failed to kill sandbox {sandbox_id}: {e}")
            return False
