import json
import re
from datetime import date, datetime, timedelta

import rag
from config import settings
from database import get_db
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, StreamingResponse
from models.models import ChatMessage, HealthRecord, User
from routers.records import _get_owned_pet
from schemas.ask import AskRequest
from sqlalchemy.orm import Session
from utils.exceptions import BadRequestException
from utils.i18n import t
from utils.limiter import limiter
from utils.messages import save_message
from utils.security import get_current_user

router = APIRouter(tags=["Ask"])

# Router for ask-related endpoints
@router.post("/ingest")
def ingest_corpus(current_user: User = Depends(get_current_user)):
    """Ingest the reference corpus into ChromaDB."""
    return rag.ingest()

def _gate_query(question: str, pet) -> str:
    """Query used to decide whether the question is in scope at all."""
    return re.sub(rf"\b{re.escape(pet.name)}\b", pet.species, question, flags=re.IGNORECASE)


def _retrieval_query(question: str, pet) -> str:
    """Query used to pick chunks — the species suffix keeps dog and cat material apart."""
    return f"{_gate_query(question, pet)} {pet.species}"


# A follow-up like "how often?" carries nothing retrievable on its own. Below this many words the previous question is prepended, so the gate and retrieval have something to match on.
# The prompt still receives the question exactly as the user typed it.
SHORT_QUESTION_WORDS = 6


def _with_context(question: str, history: list[dict]) -> str:
    """Expand a short follow-up using the last question asked. Retrieval only."""
    if len(question.split()) >= SHORT_QUESTION_WORDS:
        return question
    for turn in reversed(history):
        if turn["role"] == "user":
            return f"{turn['content']} {question}"
    return question

def _format_age(birth_date) -> str:
    """Age in days under a month, months under a year, then years — matching both clients."""
    today = date.today()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    if today.day < birth_date.day:
        months -= 1
    if months < 1:
        days = (today - birth_date).days
        return f"{days} day" if days == 1 else f"{days} days"
    if months < 12:
        return f"{months} month" if months == 1 else f"{months} months"
    years = months // 12
    return f"{years} year" if years == 1 else f"{years} years"

def _format_pet_context(pet, records) -> str:
    """Format the pet's details and health history for the prompt."""
    age = _format_age(pet.birth_date) if pet.birth_date else "unknown"

    lines = [
        f"Pet Name: {pet.name}",
        f"Species: {pet.species}",
        f"Breed: {pet.breed}",
        f"Age: {age}",
        f"Weight: {pet.weight or 'unknown'} kg",
    ]

    # An empty line costs tokens on every question and says nothing and an explicit "Allergies: none" would invite Claude to reason about an absence the app cannot actually vouch for, since an owner who never filled the field in looks identical to one whose pet genuinely has no allergies.
    if pet.dietary_restrictions:
        lines.append(f"Dietary Restrictions and Allergies: {', '.join(pet.dietary_restrictions)}")
    if pet.disabilities:
        lines.append(f"Disabilities: {', '.join(pet.disabilities)}")
    # Same reasoning as the block above. An unset field must never read as "male" or "not neutered", so each of these is only stated when the owner actually said so.
    if pet.sex:
        lines.append(f"Sex: {pet.sex}")
    if pet.neutered:
        lines.append("Neutered or spayed: yes")

    lines += [
        "",
        "Health Records:" if records else "Health Records: none",
    ]
    for record in records:
        due = f" (next due: {record.next_due_date})" if record.next_due_date else ""
        lines.append(f"- {record.date} [{record.record_type.value}] {record.title}{due}: {record.description or ''}".rstrip())
    return "\n".join(lines)

# Up to 25 messages from the past week. Cost is dominated by assistant answers, so they are truncated on a sliding scale:
# the newest keep enough detail to answer a follow-up, older ones keep only enough to identify what the topic was.
HISTORY_TURNS = 25
HISTORY_WINDOW_DAYS = 7
RECENT_ASSISTANT_CHARS = 1200
OLDER_ASSISTANT_CHARS = 300
RECENT_ANSWERS = 2


def _recent_turns(pet_id: int, db: Session) -> list[dict]:
    """Prior messages for this pet, oldest first, as Anthropic turns."""
    rows = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.pet_id == pet_id,
            ChatMessage.created_at >= datetime.now() - timedelta(days=HISTORY_WINDOW_DAYS),
        )
        .order_by(ChatMessage.id.desc())
        .limit(HISTORY_TURNS)
        .all()
    )

    # rows is newest-first, which is what makes "the last two answers" easy to count.
    turns: list[dict] = []
    answers_seen = 0
    for row in rows:
        content = row.content
        if row.role == "assistant":
            answers_seen += 1
            cap = RECENT_ASSISTANT_CHARS if answers_seen <= RECENT_ANSWERS else OLDER_ASSISTANT_CHARS
            content = content[:cap]
        turns.append({"role": row.role, "content": content})
    turns.reverse()

    # Anthropic requires the first message to be from the user and the roles to alternate.
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    # A question whose answer never saved (interrupted stream) would sit next to the new one.
    if turns and turns[-1]["role"] == "user":
        turns.pop()
    return turns


def _build_messages(question: str, chunks, pet_context: str, history: list[dict]) -> list[dict]:
    """Assemble the RAG prompt: prior turns, then retrieved context, the pet's record, the question."""
    context_text = "\n\n".join(f"[{c.source}]\n{c.text}" for c in chunks)
    return [
        *history,
        {
            "role": "user",
            "content": (
                f"CONTEXT:\n{context_text}\n\n"
                f"PET:\n{pet_context}\n\n"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Handle the /ask endpoint to process user questions about their pets."""
    # Validate the question
    question = payload.question.strip()
    if not question:
        raise BadRequestException("Question cannot be empty.", code="empty_question")

    # Retrieve the pet and its health records
    pet = _get_owned_pet(payload.pet_id, db, current_user)
    history = _recent_turns(pet.id, db)
    save_message(pet.id, "user", question)
    records = db.query(HealthRecord).filter(HealthRecord.pet_id == pet.id).all()

    # Format the pet context
    pet_context = _format_pet_context(pet, records)

    # Determine if the question is in scope and retrieve relevant chunks from ChromaDB
    retrieval_question = _with_context(question, history)
    # The corpus is English and MiniLM is English-trained, so a non-English question has to be rendered in English
    # before it is measured against the threshold. The prompt below still receives the question exactly as the user typed it.
    retrieval_question = rag.translate_to_english(retrieval_question, current_user.language)
    in_scope = rag.retrieve(_gate_query(retrieval_question, pet), 1, settings.CONFIDENCE_THRESHOLD)
    chunks = rag.retrieve(_retrieval_query(retrieval_question, pet), settings.MAX_RESULTS, settings.CONFIDENCE_THRESHOLD) if in_scope else []

    if not chunks:
        answer = t("ask.noAnswer", current_user.language)
        save_message(pet.id, "assistant", answer, [])
        return JSONResponse(
            status_code=200,
            content={"answer": answer, "sources": [], "confidence": "none"},
        )

    # Build the messages for the LLM
    messages = _build_messages(question, chunks, pet_context, history)

    # Stream the response from the LLM
    def stream_response():
        """Stream the LLM's response token by token, yielding JSON lines. The answer is saved on completion or disconnection."""
        parts = []
        seen, sources = set(), []
        for chunk in chunks:
            key = (chunk.title, chunk.section)
            if key in seen:
                continue
            seen.add(key)
            sources.append({"title": chunk.title, "section": chunk.section, "url": chunk.link})
        try:
            for token in rag.generate(messages, current_user.language):
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

    return StreamingResponse(stream_response(), media_type="application/x-ndjson")