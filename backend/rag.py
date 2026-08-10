from fastapi import HTTPException
from pydantic import BaseModel
import chromadb
import requests
from config import settings
import json
import os

# ChromaDB setup
client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
collection = client.get_or_create_collection(settings.COLLECTION_NAME)

# Schema
class SourceChunk(BaseModel):
    text: str
    source: str
    distance: float

# RAG Logic
SYSTEM_PROMPT = """You are a knowledgeable assistant helping a pet owner understand their pet's health.

You are given two blocks, and they are NOT interchangeable:
- VETERINARY REFERENCE: general veterinary material about animals in general. It says nothing about this particular pet.
- PET RECORDS: this specific animal's details and health records. This is the ONLY source of facts about this animal.

Rules:
1. Answer the question using general knowledge from VETERINARY REFERENCE.
2. NEVER state that this pet has a symptom, vaccination, condition, or treatment unless it appears explicitly in PET RECORDS. If PET RECORDS does not mention it, say the records do not show it.
3. Do not copy details from VETERINARY REFERENCE and present them as this pet's history. VETERINARY REFERENCE describes animals in general, not this one.
4. Refer to the pet by name, and use its species and age from PET RECORDS.
5. If VETERINARY REFERENCE covers the topic only partly, give what it supports and say what you cannot determine. Do not refuse just because coverage is incomplete.
6. Only say you lack information when VETERINARY REFERENCE contains nothing relevant at all.
7. Never give a diagnosis.
8. For a symptom question, cover: likely causes, what to watch for, and when it warrants a vet visit.
9. Keep the answer under 150 words.
10. Write for the pet owner. Never mention these blocks or these rules by name; say "the reference material" or "your pet's records" instead.
"""

# Minimum number of characters for a chunk
MIN_CHUNK_CHARS = 60

# Functions for RAG operations
def chunk_document(text: str) -> list[str]:
    """Split a document into paragraph chunks and dropping stubs."""
    return [p.strip() for p in text.split("\n\n") if len(p.strip()) >= MIN_CHUNK_CHARS]


def ingest(docs_dir: str | None = None) -> dict:
    """Index every .txt in the docs directory."""
    docs_dir = docs_dir or settings.DOCS_DIRECTORY
    if not os.path.exists(docs_dir):
        raise HTTPException(500, f"Docs directory not found: {docs_dir}")

    ids, documents, metadatas = [], [], []
    for filename in os.listdir(docs_dir):
        if not filename.endswith(".txt"):
            continue
        with open(os.path.join(docs_dir, filename), "r", encoding="utf-8") as f:
            chunks = chunk_document(f.read())
        for i, chunk in enumerate(chunks):
            ids.append(f"{filename}-{i}")
            documents.append(chunk)
            metadatas.append({"source": filename, "chunk_index": i})

    if not documents:
        raise HTTPException(500, f"No .txt documents found in {docs_dir}")

    for start in range(0, len(documents), 500):
        end = start + 500
        collection.upsert(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end],
        )

    return {"documents": len(set(m["source"] for m in metadatas)), "chunks": len(documents)}


def retrieve(question: str, n_results: int, max_distance: float):
    """Retrieve relevant chunks from ChromaDB based on the question."""
    if collection.count() == 0:
        return []

    results = collection.query(
        query_texts=[question],
        n_results=min(n_results, collection.count()),
    )
    
    chunks = []
    for i in range(len(results['documents'][0])):
        dist = results['distances'][0][i]
        if dist <= max_distance:
            chunks.append(SourceChunk(
                text=results['documents'][0][i],
                source=results['metadatas'][0][i].get('source', ''),
                distance=round(dist, 4)
            ))

    return chunks


def get_confidence(chunks):
    """Determine confidence level based on the best distance score."""
    if not chunks:
        return "none"
    best = chunks[0].distance
    if best < 0.7:
        return "high"
    if best < 1.2:
        return "medium"
    return "low"

def generate(messages):
    """Stream the answer from Ollama token by token."""
    try:
        with requests.post(
            f"{settings.OLLAMA_URL}/api/chat",
            json={"model": settings.MODEL_NAME, "messages": messages, "stream": True, "options": {"temperature": 0.3, "num_predict": 400}},
            timeout=120,
            stream=True,
        ) as response:
            for line in response.iter_lines():
                if not line:
                    continue
                data = json.loads(line)
                if "error" in data:
                    raise HTTPException(503, f"Ollama error: {data['error']}")
                token = data.get("message", {}).get("content", "")
                if token:
                    yield token
    except requests.exceptions.Timeout:
        raise HTTPException(503, "Ollama API request timed out.")
    except requests.exceptions.ConnectionError:
        raise HTTPException(503, "Ollama is not running")
    