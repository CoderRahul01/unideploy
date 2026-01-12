import os
import sys
from dotenv import load_dotenv

# Path setup
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

try:
    from clients.groq_client import GroqClient

    client = GroqClient()

    print(f"Testing Groq Connection with model: {client.model}...")

    response = client.chat_completion(
        [{"role": "user", "content": "Return the word 'CONNECTED' and nothing else."}]
    )

    if "CONNECTED" in response:
        print("✅ Groq Verification SUCCESS: System is online.")
    else:
        print(f"❌ Groq Verification FAILED. Response: {response}")

except Exception as e:
    print(f"❌ Groq Error: {e}")
