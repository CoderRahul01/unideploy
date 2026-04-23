import os
import shutil
import uuid
import json
from git import Repo

from clients.model_router import router, TaskType


class AnalyzerAgent:
    """
    The 'Architect' of the system.
    1. Clones Repo
    2. Generates Build Config via ModelRouter with deterministic fallback
    """

    def __init__(self):
        self.work_dir = "/tmp/unideploy-analysis"

    async def analyze(self, repo_url: str, user_id: str):
        print(f"[Analyzer] Starting analysis for {repo_url}...")

        # 1. Clone
        project_id = str(uuid.uuid4())
        repo_path = os.path.join(self.work_dir, project_id)
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)

        try:
            Repo.clone_from(repo_url, repo_path)
            print(f"[Analyzer] Cloned to {repo_path}")
            return await self.analyze_path(repo_path, project_id)
        except Exception as e:
            print(f"[Analyzer] Clone failed: {e}")
            return {"error": "Failed to clone repository"}

    async def analyze_path(self, repo_path: str, project_id: str):
        print(f"[Analyzer] Scanning path: {repo_path}")
        
        # 2. Scan
        files_structure = []
        for root, _, files in os.walk(repo_path):
            if ".git" in root or "__pycache__" in root or "node_modules" in root:
                continue
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), repo_path)
                files_structure.append(rel_path)

        # 3. E2B Dynamic Analysis
        context = "No historical context available yet."

        # 3.5 E2B Dynamic Scan (Detect actual runtime requirements)
        from builder.e2b_manager import E2BManager
        e2b = E2BManager()
        dynamic_context = e2b.analyze_codebase(repo_path)
        print(f"[Analyzer] E2B Analysis: {dynamic_context}")

        # 4. Generate Config via ModelRouter
        prompt = f"""
You are a DevOps Expert and Product Architect for UniDeploy.
Analyse this file structure and generate a JSON build configuration.

Infrastructure Tiers:
1. SEED (Free): Prototypes, MVPs, hobby projects.
2. LAUNCH ($15/mo): Growing startups — better stability, basic observability.
3. SCALE ($49/mo): High-traffic products — high availability, dedicated resources.

Files: {files_structure[:100]}
E2B Dynamic Insights: {dynamic_context}

Return ONLY valid JSON with keys:
- 'type': (node/python/go/static)
- 'build_command': command to build/install deps
- 'start_command': command to run the server
- 'port': default port (e.g. 3000 or 8000)
- 'recommended_tier': (SEED/LAUNCH/SCALE)
- 'tier_reasoning': 1-sentence explanation
"""
        try:
            response = await router.route(
                TaskType.REASONING,
                [{"role": "user", "content": prompt}],
            )
            start = response.find("{")
            end = response.rfind("}") + 1
            config = json.loads(response[start:end])
            config["id"] = project_id
            config["files"] = files_structure[:50]
            config["suggestion_engine"] = "UniDeploy AI (ModelRouter)"
            print(f"[Analyzer] Analysis complete: {config['suggestion_engine']}")
            return config
        except Exception as e:
            print(f"[Analyzer] LLM analysis failed, using static detection: {e}")

        # Static fallback — deterministic detection from file structure
        detected_type = "unknown"
        build_command = "echo 'No build step detected'"
        start_command = "echo 'No start command detected'"

        if "package.json" in files_structure:
            detected_type = "node"
            build_command = "npm install && npm run build"
            start_command = "npm start"
        elif "requirements.txt" in files_structure:
            detected_type = "python"
            build_command = "pip install -r requirements.txt"
            start_command = "python main.py"
        elif any(f.endswith(".go") for f in files_structure):
            detected_type = "go"
            build_command = "go build -o app ."
            start_command = "./app"

        config = {
            "id": project_id,
            "type": detected_type,
            "build_command": build_command,
            "start_command": start_command,
            "port": 3000 if detected_type == "node" else 8000,
            "recommended_tier": "SEED",
            "tier_reasoning": "Static file-structure detection; upgrade after profiling runtime requirements.",
            "files": files_structure[:50],
            "suggestion_engine": "UniDeploy Static Detector",
        }

        print(f"[Analyzer] Analysis complete: {config['suggestion_engine']}")
        return config

