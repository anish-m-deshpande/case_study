import os
import pypdf
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv
import threading

load_dotenv()

CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "policies"

# Global client and collection to avoid re-initialization overhead
_client = None
_collection = None
_lock = threading.Lock()

def get_collection():
    global _client, _collection
    with _lock:
        if _collection is None:
            if _client is None:
                _client = chromadb.PersistentClient(path=CHROMA_PATH)
            
            openai_ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key=os.getenv("OPENAI_API_KEY"),
                model_name="text-embedding-3-small"
            )
            
            _collection = _client.get_or_create_collection(
                name=COLLECTION_NAME,
                embedding_function=openai_ef
            )
    return _collection

def ingest_policies():
    collection = get_collection()
    
    policies_dir = "policies"
    for filename in os.listdir(policies_dir):
        if filename.endswith(".pdf"):
            path = os.path.join(policies_dir, filename)
            print(f"Processing {filename}...")
            
            reader = pypdf.PdfReader(path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            
            chunks = [c.strip() for c in text.split("\n\n") if len(c.strip()) > 50]
            
            ids = [f"{filename}_{i}" for i in range(len(chunks))]
            metadatas = [{"source": filename} for _ in range(len(chunks))]
            
            collection.add(
                documents=chunks,
                ids=ids,
                metadatas=metadatas
            )
    
    print("Ingestion complete.")

def query_policies(query_text, n_results=5):
    collection = get_collection()
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results

if __name__ == "__main__":
    if os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_API_KEY") != "your_openai_api_key_here":
        ingest_policies()
    else:
        print("Please set a valid OPENAI_API_KEY in .env before running ingestion.")
