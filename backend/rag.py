import re
from pydantic import BaseModel
import chromadb
import anthropic
from utils.exceptions import InternalException, ServiceUnavailableException
from config import settings
import os

# ChromaDB setup
client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
collection = client.get_or_create_collection(settings.COLLECTION_NAME)

# Claude API client — reads ANTHROPIC_API_KEY from the environment
claude = anthropic.Anthropic()

# Schema
class SourceChunk(BaseModel):
    text: str
    source: str
    distance: float
    title: str = ""
    url: str = ""
    section: str = ""

    @property
    def link(self) -> str:
        """Return a deep link to the cited section, if available."""
        if not self.url:
            return ""
        return f"{self.url}#{self.section.replace(' ', '_')}" if self.section else self.url

# RAG Logic
SYSTEM_PROMPT = """You are a knowledgeable assistant helping a pet owner understand their pet's health.

You are given two blocks, and they are NOT interchangeable:
- CONTEXT: general veterinary reference material about animals in general. It says nothing about this particular pet.
- PET: this specific animal's details and health records. This is the ONLY source of facts about this animal.

Rules:
1. Answer the question using general knowledge from CONTEXT.
2. NEVER state that this pet has a symptom, vaccination, condition, or treatment unless it appears explicitly in PET. If PET does not mention it, say the records do not show it.
3. Do not copy details from CONTEXT and present them as this pet's history. CONTEXT describes animals in general, not this one.
4. Refer to the pet by name, and use its species and age from PET.
5. If CONTEXT covers the topic only partly, give what it supports and say what you cannot determine. Do not refuse just because coverage is incomplete.
6. Only say you lack information when CONTEXT contains nothing relevant at all.
7. Never give a diagnosis.
8. For a symptom question, cover: likely causes, what to watch for, and when it warrants a vet visit.
9. Keep the answer under 150 words.
"""

# Claude needs the language spelled out; the app stores ISO codes.
LANGUAGE_NAMES = {
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "ar": "Arabic",
    "ru": "Russian",
    "zh": "Chinese (Simplified)",
}


def _system_prompt(lang: str | None) -> str:
    """The base prompt, plus an output-language rule for a non-English owner."""
    name = LANGUAGE_NAMES.get(lang or "en", "English")
    if name == "English":
        return SYSTEM_PROMPT
    return (
        f"{SYSTEM_PROMPT}"
        f"10. Write the entire answer in {name}. CONTEXT and PET are supplied in English; "
        f"translate whatever you use from them rather than quoting the English.\n"
    )


# Minimum number of characters for a chunk
MIN_CHUNK_CHARS = 60

# A translated question is short, so this only has to cover one sentence.
TRANSLATE_MAX_TOKENS = 200

# Functions for RAG operations
def chunk_document(text: str) -> list[str]:
    """Split a document into paragraph chunks and dropping stubs."""
    return [p.strip() for p in text.split("\n\n") if len(p.strip()) >= MIN_CHUNK_CHARS]

def load_sources(docs_dir: str) -> dict[str, dict]:
    """Map each filename to its Wikipedia title and URL, parsed from ATTRIBUTION.md."""

    attribution_path = os.path.join(docs_dir, "ATTRIBUTION.md")
    if not os.path.exists(attribution_path):
        return {}

    sources = {}
    pattern = re.compile(r"\|\s*`([^`]+)`\s*\|\s*\[([^\]]+)\]\(([^)]+)\)")
    with open(attribution_path, "r", encoding="utf-8") as f:
        for line in f:
            match = pattern.match(line)
            if match:
                filename, title, url = match.groups()
                sources[filename] = {"title": title, "url": url}
    return sources

def ingest(docs_dir: str | None = None) -> dict:
    """Index every .txt in the docs directory."""
    docs_dir = docs_dir or settings.DOCS_DIRECTORY
    if not os.path.exists(docs_dir):
        raise InternalException(f"Docs directory not found: {docs_dir}")

    ids, documents, metadatas = [], [], []
    sources = load_sources(docs_dir)
    for filename in os.listdir(docs_dir):
        if not filename.endswith(".txt"):
            continue
        with open(os.path.join(docs_dir, filename), "r", encoding="utf-8") as f:
            chunks = chunk_document(f.read())
        for i, chunk in enumerate(chunks):
            ids.append(f"{filename}-{i}")
            documents.append(chunk)
            heading = chunk.split("\n")[0]
            section = heading.split(" - ", 1)[1] if " - " in heading else ""
            info = sources.get(filename, {})
            metadatas.append({
                "source": filename,
                "chunk_index": i,
                "title": info.get("title", filename),
                "url": info.get("url", ""),
                "section": section,
            })

    if not documents:
        raise InternalException(f"No .txt documents found in {docs_dir}")

    for start in range(0, len(documents), 500):
        end = start + 500
        collection.upsert(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end],
        )

    return {"documents": len(set(m["source"] for m in metadatas)), "chunks": len(documents)}


def translate_to_english(question: str, lang: str | None) -> str:
    """Render a question in English so it can be matched against the English corpus.

    The corpus is embedded with Chroma's English-trained MiniLM, so a French question scores past
    the distance threshold and the caller falls back to "no information" before Claude is reached.
    Translating the question is far cheaper than re-embedding 946+ chunks and re-tuning 1.2.

    Returns the question unchanged on any failure — a translation outage should degrade retrieval,
    not take /ask down with it.
    """
    if not lang or lang == "en":
        return question
    try:
        message = claude.messages.create(
            model=settings.MODEL_NAME,
            max_tokens=TRANSLATE_MAX_TOKENS,
            temperature=0,
            system=(
                "Translate the user's message into English. Reply with the translation and nothing else. no preamble,"
                "no quotation marks, no explanation. If the message is already in English, repeat it unchanged."
            ),
            messages=[{"role": "user", "content": question}],
        )
        text = "".join(block.text for block in message.content if block.type == "text").strip()
        return text or question
    except Exception:
        return question


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
            meta = results['metadatas'][0][i]
            chunks.append(SourceChunk(
                text=results['documents'][0][i],
                source=meta.get('source', ''),
                distance=round(dist, 4),
                title=meta.get('title', ''),
                url=meta.get('url', ''),
                section=meta.get('section', ''),
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

def generate(messages, lang: str | None = None):
    """Stream the answer from Claude token by token, in the owner's language."""
    try:
        with claude.messages.stream(
            model=settings.MODEL_NAME,
            max_tokens=1024,
            temperature=0.3,
            system=_system_prompt(lang),
            messages=messages,
        ) as stream:
            for token in stream.text_stream:
                yield token
    except anthropic.APIConnectionError:
        raise ServiceUnavailableException("Could not reach the Claude API.", code="ai_unavailable")
    except anthropic.APIStatusError as e:
        raise ServiceUnavailableException(f"Claude API error: {e.message}")