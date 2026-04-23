import os
from builder.detect import detect_project_type


# Default port by framework
FRAMEWORK_PORTS = {
    "nextjs": 3000,
    "nodejs": 3000,
    "python": 8080,
    "vite": 3000,
    "create-react-app": 3000,
    "vanilla-html": 8080,
}


class BuildAgent:
    def __init__(self, registry_url=None):
        pass  # No Docker client needed — E2B handles the actual build

    async def run(self, project_path, project_name, log_callback=None):
        """
        Detects the project type and returns an E2B-compatible build config.
        Returns: { "build_command": str, "start_command": str, "port": int }
        """
        print(f"[BuildAgent] Detecting project type for {project_name} at {project_path}")

        if log_callback:
            await log_callback(f"[Build] Analysing project structure for {project_name}...")

        config = detect_project_type(project_path) if project_path and os.path.exists(project_path) else {"type": "unknown", "framework": "unknown"}

        framework = config.get("framework", "unknown")
        port = FRAMEWORK_PORTS.get(framework, 3000)

        # Derive install+build command (with security audit)
        build_command = config.get("build_command")
        if framework in ("nodejs", "nextjs", "vite", "create-react-app"):
            if build_command:
                build_command = f"npm install && npm audit --audit-level=critical && {build_command}"
            else:
                build_command = "npm install && npm audit --audit-level=critical"
        elif framework == "python":
            build_command = "pip install -r requirements.txt && pip-audit --severity critical || true"
        elif build_command is None:
            build_command = "echo 'No build step'"

        start_command = config.get("start_command")
        if start_command is None:
            if framework in ("vite", "create-react-app"):
                start_command = f"npx serve -s {config.get('output_dir', 'dist')} -l {port}"
            elif framework == "vanilla-html":
                start_command = f"npx serve -s . -l {port}"
            else:
                start_command = f"echo 'No start command for {framework}'"

        result = {
            "build_command": build_command,
            "start_command": start_command,
            "port": port,
            "framework": framework,
        }

        if log_callback:
            await log_callback(f"[Build] Detected: {framework} — port {port}")
            await log_callback(f"[Build] Build command: {build_command}")
            await log_callback(f"[Build] Start command: {start_command}")

        print(f"[BuildAgent] Config resolved: {result}")
        return result
