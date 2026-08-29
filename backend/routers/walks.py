from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, Pet, Walk
from schemas.walk import WalkCreate, WalkUpdate, WalkResponse
from utils.security import get_current_user
from utils.exceptions import NotFoundException


router = APIRouter(tags=["Walks"])


# Helper functions for ensuring ownership of pets and walks. The function ensures the pet belongs to the current user, raising a 404 if not.
def _get_owned_pet(pet_id: int, db: Session, current_user: User) -> Pet:
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    return pet


def _get_owned_walk(walk_id: int, db: Session, current_user: User) -> Walk:
    walk = db.query(Walk).join(Pet).filter(Walk.id == walk_id, Pet.user_id == current_user.id).first()
    if not walk:
        raise NotFoundException("Walk", walk_id)
    return walk


@router.get("/pets/{pet_id}/walks", response_model=list[WalkResponse])
def list_walks(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all walks for a given pet.

    Returns a list of walks, ordered by date and creation time in descending order.
    """
    pet = _get_owned_pet(pet_id, db, current_user)
    return (
        db.query(Walk)
        .filter(Walk.pet_id == pet.id)
        .order_by(Walk.date.desc(), Walk.created_at.desc())
        .all()
    )


@router.post("/pets/{pet_id}/walks", response_model=WalkResponse, status_code=201)
def create_walk(
    pet_id: int,
    request: WalkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a walk that has already happened."""
    pet = _get_owned_pet(pet_id, db, current_user)
    walk = Walk(pet_id=pet.id, **request.model_dump())
    db.add(walk)
    db.commit()
    db.refresh(walk)
    return walk


@router.patch("/walks/{walk_id}", response_model=WalkResponse)
def update_walk(
    walk_id: int,
    request: WalkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit a logged walk."""
    walk = _get_owned_walk(walk_id, db, current_user)
    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(walk, key, value)
    db.commit()
    db.refresh(walk)
    return walk


@router.delete("/walks/{walk_id}", status_code=204)
def delete_walk(walk_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove a logged walk."""
    walk = _get_owned_walk(walk_id, db, current_user)
    db.delete(walk)
    db.commit()
    return Response(status_code=204)