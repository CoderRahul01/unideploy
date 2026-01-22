from clients.groq_client import GroqClient
from agents.memory_agent import MemoryAgent
import re

class AutoFixAgent:
    """
    Analyzes errors and generates fixes using Dual Memory context.
    - Pinecone for code snippets.
    - SuperMemory for past wisdom.
    """

    def __init__(self):
        self.groq = GroqClient()
        self.memory = MemoryAgent()

    async def analyze_and_fix(self, project_id: int, error_log: str):
        """
        Main entry point for fixing a build/runtime error.
        """
        print(f"[AutoFixAgent] Analyzing error for project {project_id}...")

        # 1. Extract error context (file name, line number, error message)
        # This is a simplified regex; a real one would be more robust per language.
        error_match = re.search(r"File \"(.+?)\", line (\d+)", error_log)
        focus_file = error_match.group(1) if error_match else "unknown"
        
        # 2. Retrieve Context (Dual Memory)
        query = f"Error in {focus_file}: {error_log[-500:]}" # Use last 500 chars of log as query
        context = self.memory.retrieve_context(query, project_id)
        
        # 3. Formulate Prompt for Brain (Groq)
        prompt = self._build_prompt(error_log, context)
        
        # 4. Generate Fix
        messages = [
            {"role": "system", "content": "You are UniDeploy's expert debug agent. Generate a precise fix for the following error."},
            {"role": "user", "content": prompt}
        ]
        fix_suggestion = self.groq.chat_completion(messages)
        
        # 5. Verify Fix (E2B Code Interpreter)
        from builder.e2b_manager import E2BManager
        e2b = E2BManager()
        verification = e2b.verify_fix("../temp", focus_file, fix_suggestion, error_log)
        
        return {
            "focus_file": focus_file,
            "suggestion": fix_suggestion,
            "verification": verification,
            "context_retrieved": len(context["code_snippets"]) > 0
        }

    def _build_prompt(self, error_log: str, context: dict):
        code_context = "\n\n".join([
            f"--- File: {s['path']} ---\n{s['content']}" 
            for s in context["code_snippets"]
        ])
        
        wisdom_context = context["wisdom"] if context["wisdom"] else "No specific wisdom found for this error."

        return f"""
ERROR LOG:
{error_log[-1000:]}

CODE CONTEXT (from Pinecone):
{code_context}

PAST WISDOM (from SuperMemory):
{wisdom_context}

INSTRUCTIONS:
1. Analyze the error log against the provided code.
2. If the fix is obvious, provide the corrected code snippet.
3. If more info is needed, explain what to check.
4. Keep it concise.
"""
