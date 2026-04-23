from .model_router import router, TaskType

class AudioAgent:
    async def voice_to_intent(self, audio_path: str) -> str:
        # Step 1: Transcribe via ModelRouter's native HF Whisper implementation
        raw = await router._transcribe(audio_path)
        
        # Step 2: Convert raw text to technical intent via reasoning model
        messages = [
            {
                "role": "system",
                "content": (
                    "Convert this voice note into a clear technical spec. "
                    "Remove filler words. Keep all technical details. "
                    "Output a numbered requirements list."
                ),
            },
            {"role": "user", "content": f"Voice note text:\n\n{raw}"},
        ]
        return await router.route(task=TaskType.REASONING, messages=messages)

audio_agent = AudioAgent()
