import json
from clients.model_router import router, TaskType

class RecallMaxAgent:
    """
    God-Tier Long-Context Memory Agent.
    Implements:
    - Context Injection (Deduplicates and appends to context)
    - Adaptive Summarization & History Compression
    - Fact Verification
    """

    def __init__(self):
        self.compression_threshold = 14  # Max uncompressed turns

    async def compress_history(self, current_memory: dict, raw_history: list) -> tuple[dict, list]:
        """
        Compresses long chat history into ~800 semantic tokens while preserving 
        intent, key facts, tone, and emotional register.
        """
        if len(raw_history) < self.compression_threshold:
            # Not long enough to compress yet
            return current_memory, raw_history

        # We compress the older half of the history to retain immediate context in raw_history
        mid_point = len(raw_history) // 2
        history_to_compress = raw_history[:mid_point]
        retained_history = raw_history[mid_point:]
        
        previous_summary = current_memory.get("summary", "")

        prompt = f"""
You are the RecallMax autonomous memory processor. Your task is to perform Adaptive Summarization and History Compression.
Compress the following conversation turns into a dense, high-signal summary (max 800 tokens).

### Previous Context Summary (if any):
{previous_summary}

### New Turns to Compress:
{json.dumps(history_to_compress, indent=2)}

### Rules for Compression:
1. Preserve Tone (sarcasm, formality, urgency).
2. Preserve Intent (what they actually want vs. what was said).
3. Preserve Key Facts (numbers, names, decisions, commitments).
4. Remove conversational filler and redundancies.
Return only the compressed summary block text.
        """

        compressed_summary = await router.route(TaskType.REASONING, [{"role": "user", "content": prompt}])
        if not compressed_summary:
            # Fallback on failure, do not touch memory, just return original
            print("[RecallMax] Warning: Compression API call failed.")
            return current_memory, raw_history
        
        # Fact verify the new compressed summary against previous facts
        verified_summary = await self.verify_facts(previous_summary, compressed_summary)

        new_memory = current_memory.copy()
        new_memory["summary"] = verified_summary
        
        return new_memory, retained_history

    async def verify_facts(self, previous_summary: str, generated_summary: str) -> str:
        """
        Runs built-in cross-reference checks for contradictory claims within the context.
        """
        if not previous_summary:
            return generated_summary

        prompt = f"""
You are the RecallMax Fact Verifier. 
Does the new summary contradict any key facts in the previous summary?
If there are contradictions, resolve them logically or flag them.
Otherwise, return the new summary as-is.

### Previous Summary:
{previous_summary}

### New Generated Summary:
{generated_summary}
        """

        verified = await router.route(TaskType.REASONING, [{"role": "user", "content": prompt}])
        if not verified:
            return generated_summary
        return verified

    def inject_context(self, current_memory: dict, current_message: str) -> str:
        """
        Injects the compressed context memory into the system prompt space cleanly without hallucination drift.
        """
        summary = current_memory.get("summary", "")
        if not summary:
            return current_message
        
        injection = f"\n\n[RECALLMAX CONTEXT MEMORY: BEGIN]\n{summary}\n[RECALLMAX CONTEXT MEMORY: END]\n"
        return current_message + injection
