import os
import sys

# Ensure backend dir is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("--- 1. Testing Imports ---")
try:
    import firebase_admin

    print("✅ firebase_admin imported")
except ImportError as e:
    print(f"❌ firebase_admin failed: {e}")

try:
    import pinecone

    print("✅ pinecone imported")
except ImportError as e:
    print(f"❌ pinecone failed: {e}")

try:
    import requests

    print("✅ requests imported")
except ImportError as e:
    print(f"❌ requests failed: {e}")

print("\n--- 2. Testing Models ---")
try:
    import models
    from database import engine

    # Check if name exists in Project
    if hasattr(models.Project, "name"):
        print("✅ Project.name column exists")
    else:
        print("❌ Project.name column MISSING")

    p = models.Project(name="test", owner_id=1)
    print(f"✅ Project instantiation successful: {p.name}")

except Exception as e:
    print(f"❌ Model check failed: {e}")

print("\n--- 3. Testing Env ---")
from dotenv import load_dotenv

load_dotenv()
if os.getenv("PINECONE_API_KEY") == "your_pinecone_key_here":
    print("⚠️  PINECONE_API_KEY is still the template value!")
elif os.getenv("PINECONE_API_KEY"):
    print("✅ PINECONE_API_KEY found")
else:
    print("❌ PINECONE_API_KEY missing")

print("\nDone.")
