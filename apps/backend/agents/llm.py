import os
import socket
import logging
from urllib.parse import urlparse
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger("unideploy.llm")

def is_litellm_reachable(url: str) -> bool:
    """Check if the LiteLLM server is reachable at the given URL."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "localhost"
        port = parsed.port
        if port is None:
            port = 443 if parsed.scheme == "https" else 80
        # Check connection with a 0.5s timeout
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except Exception:
        return False

def get_llm(model_name: str = None):
    """Get the model instance (via LiteLLM if LITELLM_API_BASE is set and reachable, or Gemini)."""
    api_base = os.getenv("LITELLM_API_BASE")
    if api_base:
        if is_litellm_reachable(api_base):
            model = model_name or os.getenv("LITELLM_MODEL", "openai/gpt-4o-mini")
            api_key = os.getenv("LITELLM_API_KEY", "no-key")
            logger.info(f"Routing to LiteLLM at {api_base} with model {model}")
            return ChatOpenAI(
                model=model,
                temperature=0.2,
                base_url=api_base,
                api_key=api_key,
            )
        else:
            logger.warning(f"LiteLLM configured at {api_base} but is unreachable. Falling back to direct Gemini API.")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    logger.info("Routing directly to Gemini API")
    return ChatGoogleGenerativeAI(
        model=model_name or "gemini-1.5-pro",
        temperature=0.2,
        max_retries=2,
    )
