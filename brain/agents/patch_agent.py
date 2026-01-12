from clients.groq_client import GroqClient
import os

class PatchAgent:
    """
    Applies AI-generated fixes to actual source files.
    """

    def __init__(self):
        self.groq = GroqClient()

    async def apply_fix(self, file_path: str, suggestion: str, original_content: str):
        """
        Uses LLM to perform a structured edit on the file content based on a suggestion.
        """
        print(f"[PatchAgent] Applying fix to {file_path}...")

        prompt = f"""
You are an expert software engineer. Apply the following fix suggestion to the provided source code.
Return ONLY the full corrected source code of the file. No explanations, no markdown blocks.

FILE PATH: {file_path}

FIX SUGGESTION:
{suggestion}

ORIGINAL CONTENT:
--- START ---
{original_content}
--- END ---

INSTRUCTIONS:
1. Incorporate the fix exactly as suggested.
2. Maintain existing coding style and indentation.
3. If the fix is ambiguous, make the most logical choice.
4. Output the COMPLETE file content.
"""
        messages = [
            {{"role": "system", "content": "You are a code patching specialist. Output the full file content after applying changes."}},
            {{"role": "user", "content": prompt}}
        ]
        
        patched_code = self.groq.chat_completion(messages)
        
        if patched_code and len(patched_code) > 10: # Basic sanity check
            # Strip markdown if LLM disobeyed and added backticks
            if patched_code.startswith("```"):
                lines = patched_code.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                patched_code = "\n".join(lines).strip()
            
            return patched_code.strip()
        
        return None
