import os
import shutil
import uuid
import json
from git import Repo
from clients.pinecone_client import PineconeClient
from clients.supermemory_client import SuperMemoryClient

from clients.groq_client import GroqClient


class AnalyzerAgent:
    """
    The 'Architect' of the system.
    1. Clones Repo
    2. Indexes Code -> Pinecone
    3. Fetches Wisdom -> SuperMemory
    4. Generates Build Config -> Groq LLM
    """

    def __init__(self):
        self.pinecone = PineconeClient()
        self.memory = SuperMemoryClient()
        self.llm = GroqClient()
        self.work_dir = "temp_analysis"

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

        # 3. Consult Wisdom (SuperMemory)
        context = "No historical context available yet."
        try:
            context = self.memory.query(
                f"What is the preferred build pack for a project with files: {files_structure[:10]}?"
            )
        except Exception as e:
            print(f"[Analyzer] Memory consult failed: {e}")

        # 4. Generate Config (Groq LLM)
        if self.llm.client:
            prompt = f"""
            You are a DevOps Expert and Product Architect for UniDeploy. 
            Analyze this file structure and generate a JSON build configuration and infrastructure recommendation.
            
            Infrastructure Tiers:
            1. SEED (Free): Best for prototypes, MVPs, and hobby projects. (Standard E2B Sandbox)
            2. LAUNCH ($15/mo): For growing startups. Includes better stability and basic observability. (Small Dedicated VM)
            3. SCALE ($49/mo): For high-traffic products. High availability, dedicated resources, and AI auto-fix. (Medium Managed Cluster)

            Files: {files_structure[:100]}
            
            Context from Memory: {context}
            
            Return ONLY valid JSON with keys: 
            - 'type': (node/python/go/static)
            - 'build_command': The command to build/install deps
            - 'start_command': The command to run the server
            - 'port': Default port (e.g. 3000, 8000)
            - 'recommended_tier': (SEED/LAUNCH/SCALE)
            - 'tier_reasoning': A 1-sentence explanation of why this tier fits the project complexity and growth potential.
            """

            try:
                response = self.llm.chat_completion([{"role": "user", "content": prompt}])
                start = response.find("{")
                end = response.rfind("}") + 1
                config = json.loads(response[start:end])
                config["id"] = project_id
                config["files"] = files_structure[:50]
                config["suggestion_engine"] = f"UniDeploy AI ({self.llm.model})"
                return config
            except Exception as e:
                print(f"[Analyzer] LLM error or parsing error: {e}")

        # Fallback Logic (Mock)
        detected_type = "unknown"
        build_command = "echo 'No build'"

        if "package.json" in files_structure:
            detected_type = "node"
            build_command = "npm install && npm run build"
        elif "requirements.txt" in files_structure:
            detected_type = "python"
            build_command = "pip install -r requirements.txt"

        config = {
            "id": project_id,
            "type": detected_type,
            "build_command": build_command,
            "port": 3000 if detected_type == "node" else 8000,
            "recommended_tier": "SEED",
            "tier_reasoning": "Standard detection suggested a Seed tier for this project structure.",
            "files": files_structure[:50],
            "wisdom_context": context,
            "suggestion_engine": "UniDeploy Fallback Engine",
        }

        print(f"[Analyzer] Analysis complete: {config['suggestion_engine']}")
        return config

