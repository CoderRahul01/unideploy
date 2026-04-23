from clients.model_router import router, TaskType


class PatchAgent:
    """
    Applies AI-generated fixes to actual source files using the ModelRouter.
    """

    async def apply_fix(self, file_path: str, suggestion: str, original_content: str) -> str | None:
        """
        Uses the LLM to perform a structured edit on the file content.
        Returns the full corrected source code, or None if patching failed.
        """
        print(f"[PatchAgent] Applying fix to {file_path}...")

        prompt = (
            f"You are an expert software engineer. Apply the following fix suggestion to "
            f"the provided source code.\n"
            f"Return ONLY the full corrected source code of the file. "
            f"No explanations, no markdown blocks.\n\n"
            f"FILE PATH: {file_path}\n\n"
            f"FIX SUGGESTION:\n{suggestion}\n\n"
            f"ORIGINAL CONTENT:\n--- START ---\n{original_content}\n--- END ---\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Incorporate the fix exactly as suggested.\n"
            f"2. Maintain existing coding style and indentation.\n"
            f"3. If the fix is ambiguous, make the most logical choice.\n"
            f"4. Output the COMPLETE file content."
        )

        messages = [
            {"role": "system", "content": "You are a code patching specialist. Output the full file content after applying changes."},
            {"role": "user", "content": prompt},
        ]

        try:
            patched_code = await router.route(TaskType.CODE_GENERATION, messages)
        except Exception as e:
            print(f"[PatchAgent] LLM call failed: {e}")
            return None

        if not patched_code or len(patched_code) < 10:
            return None

        # Strip markdown fences if the model added them despite instructions
        if patched_code.startswith("```"):
            lines = patched_code.split("\n")
            lines = lines[1:] if lines[0].startswith("```") else lines
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            patched_code = "\n".join(lines)

        return patched_code.strip()
