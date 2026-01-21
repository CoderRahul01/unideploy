import os
import requests
import json


class SuperMemoryClient:
    """
    Client for SuperMemory.ai (PRO)
    Acts as the 'Wisdom' layer.
    """

    BASE_URL = "https://v2.api.supermemory.ai"

    def __init__(self):
        self.api_key = os.getenv("SUPERMEMORY_API_KEY")
        if not self.api_key:
            print("[SuperMemory] Warning: No API Key found.")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def add_context(self, content: str, source: str = "unideploy"):
        """
        Ingests high-level context (e.g., 'User prefers Node 18').
        """
        if not self.api_key:
            return
        try:
            payload = {"content": content, "metadata": {"source": source}}
            # Hypothetical endpoint
            res = requests.post(
                f"{self.BASE_URL}/add", json=payload, headers=self.headers
            )
            res.raise_for_status()
            print(f"[SuperMemory] Persisted context from {source}")
            return res.json()
        except Exception as e:
            print(f"[SuperMemory] Add failed: {e}")

    def query(self, question: str):
        """
        Asks the memory a question.
        """
        if not self.api_key:
            return "SuperMemory not configured."
        try:
            payload = {"query": question}
            res = requests.post(
                f"{self.BASE_URL}/query", json=payload, headers=self.headers
            )
            res.raise_for_status()
            return res.json().get("answer", "")
        except Exception as e:
            print(f"[SuperMemory] Query failed: {e}")
            return None
