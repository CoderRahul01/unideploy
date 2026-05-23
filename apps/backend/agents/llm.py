import os
from langchain_google_genai import ChatGoogleGenerativeAI

def get_llm():
    """Get the default Gemini LLM instance."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        temperature=0.2,
        max_retries=2,
    )
