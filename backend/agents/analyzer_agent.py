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
        except Exception as e:
            print(f"[Analyzer] Clone failed: {e}")
            return {"error": "Failed to clone repository"}

        # 2. Scan & Index (Pinecone)
        files_structure = []
        # TODO: Real chunking & upsert
        for root, _, files in os.walk(repo_path):
            if ".git" in root: continue
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), repo_path)
                files_structure.append(rel_path)
        
        # 3. Consult Wisdom (SuperMemory)
        context = self.memory.query(f"What is the preferred build pack for a project with files: {files_structure[:10]}?")
        
        # 4. Generate Config (Groq LLM)
        if self.llm.client:
            prompt = f"""
            You are a DevOps Expert. Analyze this file structure and generate a JSON build configuration.
            Files: {files_structure[:100]}
            
            Context from Memory: {context}
            
            Return ONLY valid JSON with keys: 'type' (node/python/go/static), 'build_command', 'start_command', 'port'.
            """
            
            response = self.llm.chat_completion([{"role": "user", "content": prompt}])
            
            # Simple cleaning if LLM talks too much
            try:
                # Find JSON bounds
                start = response.find('{')
                end = response.rfind('}') + 1
                config = json.loads(response[start:end])
                config['id'] = project_id
                config['files'] = files_structure[:50]
                config['suggestion'] = f"AI Analysis by Groq ({self.llm.model})"
                return config
            except Exception as e:
                print(f"[Analyzer] Failed to parse LLM response: {e}")
                # Fallback below
        
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
            "files": files_structure[:50],
            "wisdom_context": context,
            "suggestion": "Fallback: Standard Logic (Groq not available or failed)"
        }
        
        print(f"[Analyzer] Analysis complete: {config['suggestion']}")
        return config
