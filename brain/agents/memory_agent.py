import os
import glob
from clients.pinecone_client import PineconeClient
from clients.supermemory_client import SuperMemoryClient

class MemoryAgent:
    """
    Orchestrates the Dual Memory system:
    - Pinecone for raw code vectors.
    - SuperMemory.ai for synthesized wisdom.
    """

    def __init__(self):
        self.pinecone = PineconeClient()
        self.supermemory = SuperMemoryClient()

    def index_project(self, project_id: int, project_path: str):
        """
        Walks through the project, chunks files, and indexes them in Pinecone.
        """
        print(f"[MemoryAgent] Indexing project {project_id} at {project_path}...")
        
        # 1. Collect all relevant files (skipping large binaries, node_modules, etc.)
        files_to_index = []
        exclude_dirs = {".git", "node_modules", "vendor", "__pycache__", "dist", "build"}
        exclude_extensions = {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".tar", ".gz", ".exe", ".bin", ".lockb", ".ico"}

        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if any(file.endswith(ext) for ext in exclude_extensions):
                    continue
                files_to_index.append(os.path.join(root, file))

        print(f"[MemoryAgent] Found {len(files_to_index)} files to index.")

        # 2. Chunk and embed
        batch_vectors = []
        for file_path in files_to_index:
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                # Simple chunking for now (e.g., by line count or size)
                # In a real app, we'd use a parser or better semantic chunking
                # For now, we'll index the whole file if small, or split if large.
                rel_path = os.path.relpath(file_path, project_path)
                
                # Generate embedding for the file (or chunks)
                # We'll rely on the enhanced PineconeClient to handle embedding generation
                embedding = self.pinecone.generate_embedding(content)
                if embedding:
                    metadata = {
                        "project_id": project_id,
                        "path": rel_path,
                        "content": content[:1000] # Store snippet in metadata for easy retrieval
                    }
                    vector_id = f"proj_{project_id}_{rel_path.replace('/', '_')}"
                    batch_vectors.append((vector_id, embedding, metadata))
            
            except Exception as e:
                print(f"[MemoryAgent] Failed to index {file_path}: {e}")

        # 3. Upsert to Pinecone
        if batch_vectors:
            self.pinecone.upsert_vectors(batch_vectors)
            print(f"[MemoryAgent] Successfully indexed {len(batch_vectors)} files.")

    def store_wisdom(self, content: str, project_id: int):
        """
        Persists high-level project insights to SuperMemory.
        """
        print(f"[MemoryAgent] Storing wisdom for project {project_id}...")
        self.supermemory.add_context(content, source=f"unideploy_project_{project_id}")

    def retrieve_context(self, query: str, project_id: int):
        """
        Retrieves relevant code snippets and past wisdom for a query.
        """
        print(f"[MemoryAgent] Retrieving context for: {query}")
        
        # 1. Retrieve from Pinecone (Raw Code)
        query_vector = self.pinecone.generate_embedding(query)
        pinecone_results = self.pinecone.query_similar(query_vector, top_k=5)
        
        # 2. Retrieve from SuperMemory (Wisdom)
        wisdom = self.supermemory.query(query)
        
        return {
            "code_snippets": [match.metadata for match in pinecone_results.matches] if pinecone_results else [],
            "wisdom": wisdom
        }
