import os
from litellm import Router


def _build_model_list() -> list:
    """Builds the LiteLLM model list from available env vars (Groq → NVIDIA → HuggingFace)."""
    models = []
    if os.getenv("GROQ_API_KEY"):
        models.append({
            "model_name": "primary",
            "litellm_params": {
                "model": "groq/llama3-70b-8192",
                "api_key": os.getenv("GROQ_API_KEY"),
            },
        })
    if os.getenv("NVIDIA_API_KEY"):
        models.append({
            "model_name": "nvidia-fallback",
            "litellm_params": {
                "model": "openai/meta/llama-3.1-70b-instruct",
                "api_base": "https://integrate.api.nvidia.com/v1",
                "api_key": os.getenv("NVIDIA_API_KEY"),
            },
        })
    if os.getenv("HF_API_KEY"):
        models.append({
            "model_name": "hf-fallback",
            "litellm_params": {
                "model": "huggingface/mistralai/Mistral-7B-Instruct-v0.3",
                "api_key": os.getenv("HF_API_KEY"),
            },
        })
    return models


class LLMClient:
    """
    Unified LLM client backed by LiteLLM Router.
    Fallback chain: Groq → NVIDIA → HuggingFace.
    Retries each provider twice before falling back; cools down unhealthy providers for 30 s.
    """

    def __init__(self):
        model_list = _build_model_list()
        if not model_list:
            print("[LLMClient] Warning: No AI provider API keys configured.")
            self._router = None
            self._primary = None
            return

        names = [m["model_name"] for m in model_list]
        fallbacks = [{names[0]: names[1:]}] if len(names) > 1 else []

        self._router = Router(
            model_list=model_list,
            fallbacks=fallbacks,
            num_retries=2,
            cooldown_time=30,
        )
        self._primary = names[0]

    def chat_completion(self, messages: list, temperature: float = 0.2) -> str | None:
        if not self._router:
            return None
        try:
            response = self._router.completion(
                model=self._primary,
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[LLMClient] All providers failed: {e}")
            return None
