import os
import sys

# Ensure this script runs from the backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.recallmax_agent import RecallMaxAgent
from dotenv import load_dotenv

load_dotenv()

def test_recallmax():
    print("Initializing RecallMaxAgent...")
    agent = RecallMaxAgent()
    
    # We lower the threshold to 4 to trigger compression easily without a massive payload
    agent.compression_threshold = 4
    
    current_memory = {"summary": "The user started a Next.js project."}
    
    # Simulate a long conversation
    history = [
        {"role": "user", "content": "How do I add Tailwind?"},
        {"role": "assistant", "content": "You can install it via npm and configure postcss..."},
        {"role": "user", "content": "I want to add dark mode too."},
        {"role": "assistant", "content": "Sure, use next-themes to handle dark mode classes."},
        {"role": "user", "content": "Wait, I actually want to use styled-components instead of Tailwind. Can you help me set that up?"},
        {"role": "assistant", "content": "Okay, removing Tailwind and setting up styled-components..."},
    ]
    
    print(f"\n[Test] Previous Summary: {current_memory.get('summary')}")
    print(f"[Test] Starting History: {len(history)} turns")
    
    updated_memory, retained_history = agent.compress_history(current_memory, history)
    
    print("\n========= Compression Results =========")
    print(f"[Test] New Summary:\n{updated_memory.get('summary')}")
    print(f"\n[Test] Retained History Length: {len(retained_history)}")
    
    injected_prompt = agent.inject_context(updated_memory, "System Prompt: Help user write code.")
    print("\n[Test] Injected System Prompt Demo:\n" + injected_prompt)

    # Basic Assertion
    assert len(retained_history) == 3, "Ah, midpoint should be 3 items retained"
    assert "summary" in updated_memory, "Summary key must exist"
    assert current_memory["summary"] != updated_memory["summary"], "Summary should be updated!"
    
    print("\n✅ Verification Passed!")

if __name__ == "__main__":
    if not os.getenv("GROQ_API_KEY") and not os.getenv("NVIDIA_API_KEY") and not os.getenv("HF_API_KEY"):
        print("Skipping LLM execution; no API keys provided.")
    else:
        test_recallmax()
