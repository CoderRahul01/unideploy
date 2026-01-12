import os
from groq import Groq

class GroqClient:
    """
    Client for Groq API (High-Speed LLM).
    Acts as the 'Brain' for generating intelligence.
    """
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        # Updated to current stable model
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.client = None
        
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
                print(f"[Groq] Connected. Model: {self.model}")
            except Exception as e:
                print(f"[Groq] Connection failed: {e}")
        else:
            print("[Groq] Warning: API Key missing.")

    def chat_completion(self, messages, temperature=0.2):
        """
        Sends a chat request to Groq.
        """
        if not self.client: return None
        try:
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=temperature,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"[Groq] Request failed: {e}")
            return None
