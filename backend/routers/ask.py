import json
from datetime import date
from fastapi import APIRouter, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from config import settings
from database import get_db
from models.models import User, HealthRecord
from schemas.ask import AskRequest
from utils.security import get_current_user
from utils.limiter import limiter
from utils.activity import log_activity
from utils.exceptions import BadRequestException
from utils.messages import save_message
from routers.records import _get_owned_pet
import rag
import re
from urllib.parse import quote

router = APIRouter(tags=["Ask"])

# Helper functions for the /ask endpoint in order to turn citations into links that direct to the source.
def _wiki_link(heading: str) -> str:
    """Turn 'Article - Section' into a markdown link to that Wikipedia section."""
    article, _, section = heading.partition(" - ")
    url = "https://en.wikipedia.org/wiki/" + quote(article.replace(" ", "_"))
    if section:
        url += "#" + quote(section.replace(" ", "_"))
    return f"[{heading}]({url})"


# Router for ask-related endpoints
@router.post("/ingest")
def ingest_corpus(current_user: User = Depends(get_current_user)):
    """Ingest the reference corpus into ChromaDB."""
    return rag.ingest()

def _gate_query(question: str, pet) -> str:
    """Query used to decide whether the question is in scope at all."""
    return re.sub(re.escape(pet.name), pet.species, question, flags=re.IGNORECASE)


def _retrieval_query(question: str, pet) -> str:
    """Query used to pick chunks — the species suffix keeps dog and cat material apart."""
    return f"{_gate_query(question, pet)} {pet.species}"

def _format_pet_context(pet, records) -> str:
    """Format the pet's details and health history for the prompt."""
    age = "unknown"
    if pet.birth_date:
        today = date.today()
        age = f"{today.year - pet.birth_date.year - ((today.month, today.day) < (pet.birth_date.month, pet.birth_date.day))} years"

    lines = [
        f"Pet Name: {pet.name}",
        f"Species: {pet.species}",
        f"Breed: {pet.breed}",
        f"Age: {age}",
        f"Weight: {pet.weight or 'unknown'} kg",
        "",
        "Health Records:" if records else "Health Records: none",
    ]
    for record in records:
        due = f" (next due: {record.next_due_date})" if record.next_due_date else ""
        lines.append(f"- {record.date} [{record.record_type.value}] {record.title}{due}: {record.description or ''}".rstrip())
    return "\n".join(lines)


def _build_messages(question: str, chunks, pet_context: str) -> list[dict]:
    """Assemble the RAG prompt: rules, retrieved context, the pet's own record, the question."""
    context_text = "\n\n".join(c.text for c in chunks)
    return [
        {"role": "system", "content": rag.SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"VETERINARY REFERENCE:\n{context_text}\n\n"
                f"PET RECORDS:\n{pet_context}\n\n"
                f"QUESTION:\n{question}"
            ),
        },
    ]


# This endpoint handles user questions using the RAG approach, retrieving relevant information from ChromaDB and generating a response with the LLM.
@router.post("/ask")
@limiter.limit("10/minute")
def ask(
    request: Request,
    payload: AskRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Handle the /ask endpoint to process user questions about their pets."""
    # Validate the question
    question = payload.question.strip()
    if not question:
        raise BadRequestException("Question cannot be empty.")

    # Retrieve the pet and its health records
    pet = _get_owned_pet(payload.pet_id, db, current_user)
    save_message(pet.id, "user", question)
    records = db.query(HealthRecord).filter(HealthRecord.pet_id == pet.id).all()

    # Format the pet context
    pet_context = _format_pet_context(pet, records)

    # Determine if the question is in scope and retrieve relevant chunks from ChromaDB
    in_scope = rag.retrieve(_gate_query(question, pet), 1, settings.CONFIDENCE_THRESHOLD)
    chunks = rag.retrieve(_retrieval_query(question, pet), settings.MAX_RESULTS, settings.CONFIDENCE_THRESHOLD) if in_scope else []

    if not chunks:
        return JSONResponse(
            status_code=200,
            content={
                "answer": (
                    "I don't have information on that in my pet care references. "
                    "This is general information, not veterinary advice — consult your vet."
                ),
                "sources": [],
                "confidence": "none",
            },
        )
    # Build the messages for the LLM
    messages = _build_messages(question, chunks, pet_context)

    # Stream the response from the LLM
    def stream_response():
        """Stream the LLM's response token by token, yielding JSON lines. The answer is saved on completion or disconnection."""
        parts = []
        sources = sorted({_wiki_link(chunk.text.split("\n", 1)[0].strip()) for chunk in chunks})
        try:
            for token in rag.generate(messages):
                parts.append(token)
                yield json.dumps({"token": token}) + "\n"
            yield json.dumps({"meta": {
                "sources": sources,
                "confidence": rag.get_confidence(chunks),
                "distances": [chunk.distance for chunk in chunks],
            }}) + "\n"
        finally:
            if parts:
                save_message(pet.id, "assistant", "".join(parts), sources)

    background_tasks.add_task(log_activity, current_user.id, "ask", detail=question[:200], pet_id=pet.id)

    return StreamingResponse(stream_response(), media_type="application/x-ndjson")