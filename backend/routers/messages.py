import json

from database import get_db
from fastapi import APIRouter, Depends, Response, status
from models.models import ChatMessage, Pet, User
from routers.records import _get_owned_pet
from schemas.message import MessageResponse
from sqlalchemy.orm import Session
from utils.exceptions import NotFoundException
from utils.security import get_current_user

# Router for chat message endpoints
router = APIRouter(tags=["Chat History"])

# Functions to convert between database models and response schemas
def _to_response(message: ChatMessage) -> MessageResponse:
    """Decode the stored JSON sources into a real list."""
    return MessageResponse(
        id=message.id,
        pet_id=message.pet_id,
        role=message.role,
        content=message.content,
        sources=json.loads(message.sources) if message.sources else [],
        created_at=message.created_at,
    )


@router.get("/pets/{pet_id}/messages", response_model=list[MessageResponse])
def list_messages(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return the conversation for one pet, oldest first."""
    pet = _get_owned_pet(pet_id, db, current_user)
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.pet_id == pet.id)
        .order_by(ChatMessage.id)
        .all()
    )
    return [_to_response(m) for m in messages]


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(message_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a single message."""
    message = (
        db.query(ChatMessage)
        .join(Pet)
        .filter(ChatMessage.id == message_id, Pet.user_id == current_user.id)
        .first()
    )
    if not message:
        raise NotFoundException("Message", message_id)
    db.delete(message)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/pets/{pet_id}/messages", status_code=status.HTTP_204_NO_CONTENT)
def clear_messages(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete the whole conversation for one pet."""
    pet = _get_owned_pet(pet_id, db, current_user)
    db.query(ChatMessage).filter(ChatMessage.pet_id == pet.id).delete()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)