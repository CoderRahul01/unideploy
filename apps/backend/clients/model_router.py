
import os, base64
from openai import AsyncOpenAI
from huggingface_hub import AsyncInferenceClient
from enum import Enum

class TaskType(Enum):
    CODE_GENERATION = "code"
    REASONING       = "reasoning"
    VISION          = "vision"
    EMBEDDING       = "embedding"

# NVIDIA NIM — OpenAI-compatible
nvidia = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_API_KEY", ""),
)

# HuggingFace router — OpenAI-compatible
hf = AsyncOpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.environ.get("HF_API_KEY", ""),
)

# HuggingFace native (Whisper, non-chat)
hf_native = AsyncInferenceClient(
    provider="hf-inference",
    api_key=os.environ.get("HF_API_KEY", ""),
)

ROUTING_TABLE = {
    TaskType.CODE_GENERATION: [
        ("nvidia", "qwen/qwen2.5-coder-32b-instruct"),
        ("nvidia", "deepseek-ai/deepseek-coder-6.7b-instruct"),
    ],
    TaskType.REASONING: [
        ("nvidia", "meta/llama-3.3-70b-instruct"),
        ("nvidia", "meta/llama-3.1-8b-instruct"),
    ],
    TaskType.VISION: [
        ("nvidia", "meta/llama-3.2-90b-vision-instruct"),
        ("nvidia", "microsoft/phi-3.5-vision-instruct"),
        ("hf",     "Salesforce/blip-image-captioning-large"),
    ],
    TaskType.EMBEDDING: [
        ("nvidia", "nvidia/llama-3.2-nv-embedqa-1b-v2"),
        ("hf",     "sentence-transformers/all-MiniLM-L6-v2"),
    ],
}

class ModelRouter:
    async def route(self, task: TaskType, messages: list,
                    image_path: str = None, audio_path: str = None) -> str:

        if audio_path:
            return await self._transcribe(audio_path)

        if image_path:
            messages = self._inject_image(messages, image_path)
            task = TaskType.VISION

        for provider, model_id in ROUTING_TABLE[task]:
            try:
                client = nvidia if provider == "nvidia" else hf
                res = await client.chat.completions.create(
                    model=model_id, messages=messages,
                    max_tokens=4096, temperature=0.2,
                )
                return res.choices[0].message.content
            except Exception as e:
                print(f"[ModelRouter] Error with {model_id} ({provider}): {e}")
                if "429" in str(e):
                    continue   # try next model
                raise

        raise RuntimeError(f"All models exhausted for {task}")

    def _inject_image(self, messages: list, image_path: str) -> list:
        ext = image_path.rsplit(".", 1)[-1].lower()
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")
        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        
        # Clone messages to avoid mutating the original
        new_messages = [msg.copy() for msg in messages]
        
        for msg in reversed(new_messages):
            if msg["role"] == "user":
                content = msg["content"]
                msg["content"] = [
                    {"type": "text", "text": content if isinstance(content, str) else ""},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ]
                return new_messages
        return new_messages

    async def _transcribe(self, audio_path: str) -> str:
        with open(audio_path, "rb") as f:
            result = await hf_native.automatic_speech_recognition(
                f, model="openai/whisper-large-v3"
            )
        return result.text

    async def embed(self, text: str) -> list[float]:
        for provider, model_id in ROUTING_TABLE[TaskType.EMBEDDING]:
            try:
                client = nvidia if provider == "nvidia" else hf
                res = await client.embeddings.create(input=text, model=model_id)
                return res.data[0].embedding
            except Exception as e:
                print(f"[ModelRouter] Embedding error with {model_id} ({provider}): {e}")
                if "429" in str(e):
                    continue
                raise
        raise RuntimeError("All embedding models exhausted")

router = ModelRouter()
