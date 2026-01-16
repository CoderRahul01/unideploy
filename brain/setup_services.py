
import os
import sys
from getpass import getpass
import time
from pinecone import Pinecone, ServerlessSpec

def setup_pinecone():
    print("\n🌲 --- Pinecone Setup ---")
    print("This will configure your Pinecone Serverless index.")
    
    api_key = os.getenv("PINECONE_API_KEY") or getpass("Enter Pinecone API Key: ")
    if not api_key:
        print("Skipping Pinecone setup (no key provided).")
        return None, None

    pc = Pinecone(api_key=api_key)
    
    index_name = input("Enter Index Name [unideploy-code]: ").strip() or "unideploy-code"
    
    # Check if index exists
    existing_indexes = [i.name for i in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        print(f"Index '{index_name}' not found. Creating Serverless index...")
        cloud = input("Cloud Provider (aws/gcp/azure) [aws]: ").strip() or "aws"
        region = input("Region [us-east-1]: ").strip() or "us-east-1"
        
        try:
            pc.create_index(
                name=index_name,
                dimension=1024, # Multilingual-e5-large
                metric="cosine",
                spec=ServerlessSpec(
                    cloud=cloud,
                    region=region
                )
            )
            print(f"Creating index '{index_name}'. This may take a moment...")
            while not pc.describe_index(index_name).status['ready']:
                time.sleep(1)
            print("Index created and ready!")
        except Exception as e:
            print(f"Failed to create index: {e}")
            return None, None
    else:
        print(f"Index '{index_name}' already exists.")
        
    return api_key, index_name

def setup_supermemory():
    print("\n🧠 --- Supermemory Setup ---")
    api_key = os.getenv("SUPERMEMORY_API_KEY") or getpass("Enter Supermemory API Key (optional): ")
    return api_key

def update_env(pinecone_key, pinecone_index, supermemory_key):
    env_path = ".env"
    
    # Read existing
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
    else:
        lines = []

    # Helper to update or append
    def set_var(key, value):
        found = False
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={value}\n"
                found = True
                break
        if not found:
            lines.append(f"{key}={value}\n")

    if pinecone_key:
        set_var("PINECONE_API_KEY", pinecone_key)
    if pinecone_index:
        set_var("PINECONE_INDEX", pinecone_index)
        # Default env setup if not present, though newer SDK uses cloud/region in spec
        set_var("PINECONE_ENV", "us-east-1") 
        
    if supermemory_key:
        set_var("SUPERMEMORY_API_KEY", supermemory_key)
        
    with open(env_path, "w") as f:
        f.writelines(lines)
    
    print(f"\n✅ Updated {env_path}")

def main():
    print("UniDeploy Brain - Service Setup Script")
    print("======================================")
    
    # 1. Pinecone
    p_key, p_index = setup_pinecone()
    
    # 2. Supermemory
    s_key = setup_supermemory()
    
    # 3. Write to .env
    update_env(p_key, p_index, s_key)
    
    print("\nSetup complete! You can now run the brain/main.py server.")

if __name__ == "__main__":
    main()
