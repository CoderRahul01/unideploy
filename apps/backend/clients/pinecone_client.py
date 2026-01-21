import os

try:
    from pinecone import Pinecone
except ImportError:
    Pinecone = None


class PineconeClient:
    """
    Client for Pinecone (Serverless)
    Acts as the 'Library' layer for raw code vectors.
    """

    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.env = os.getenv("PINECONE_ENV", "us-east-1")
        self.index_name = os.getenv("PINECONE_INDEX", "unideploy-code")
        self.client = None
        self.index = None

        if self.api_key and Pinecone:
            try:
                self.client = Pinecone(api_key=self.api_key)
                self.index = self.client.Index(self.index_name)
                print(f"[Pinecone] Connected to index '{self.index_name}'")
            except Exception as e:
                print(f"[Pinecone] Connection failed: {e}")
        else:
            print("[Pinecone] Warning: API Key missing or library not installed.")

    def generate_embedding(self, text: str):
        """
        Generates an embedding using Pinecone Inference.
        """
        if not self.client:
            return None
        try:
            # Using Pinecone's inference API for embeddings
            # Common model: "multilingual-e5-large" (1024 dims)
            model = "multilingual-e5-large"
            embeddings = self.client.inference.embed(
                model=model,
                inputs=[text],
                parameters={"input_type": "passage"}
            )
            return embeddings[0].values
        except Exception as e:
            print(f"[Pinecone] Embedding failed: {e}")
            return None

    def upsert_vectors(self, vectors):
        """
        vectors: list of (id, embedding, metadata) tuples
        """
        if not self.index:
            return
        try:
            # Format vectors for pinecone client
            formatted = [
                {"id": v[0], "values": v[1], "metadata": v[2]}
                for v in vectors
            ]
            self.index.upsert(vectors=formatted)
            print(f"[Pinecone] Upserted {len(vectors)} vectors.")
        except Exception as e:
            print(f"[Pinecone] Upsert failed: {e}")

    def query_similar(self, vector, top_k=5):
        if not self.index or vector is None:
            return None
        try:
            return self.index.query(vector=vector, top_k=top_k, include_metadata=True)
        except Exception as e:
            print(f"[Pinecone] Query failed: {e}")
            return None
