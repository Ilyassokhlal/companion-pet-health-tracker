from fastapi import APIRouter, Depends, Response, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, Pet
from schemas.pet import PetCreate, PetUpdate, PetResponse
from utils.security import get_current_user
from utils.activity import log_activity
from utils.exceptions import NotFoundException

# Router setup
router = APIRouter(prefix="/pets", tags=["Pets"])


# Pet endpoints
@router.get("", response_model=list[PetResponse])
def list_pets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all pets for the authenticated user."""
    return db.query(Pet).filter(Pet.user_id == current_user.id).all()


# Create, Read, Update, Delete (CRUD) operations for pets
@router.post("", response_model=PetResponse, status_code=201)
def create_pet(request: PetCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new pet for the authenticated user."""
    pet = Pet(**request.model_dump(), user_id=current_user.id)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    background_tasks.add_task(log_activity, current_user.id, "create_pet", pet_id=pet.id)
    return pet


@router.get("/{pet_id}", response_model=PetResponse)
def get_pet(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific pet by ID."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    return pet


@router.patch("/{pet_id}", response_model=PetResponse)
def update_pet(pet_id: int, request: PetUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a specific pet by ID."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(pet, key, value)
    db.commit()
    db.refresh(pet)
    background_tasks.add_task(log_activity, current_user.id, "update_pet", pet_id=pet.id)
    return pet


@router.delete("/{pet_id}", status_code=204)
def delete_pet(pet_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a specific pet by ID."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    db.delete(pet)
    db.commit()
    background_tasks.add_task(log_activity, current_user.id, "delete_pet", detail=f"pet_id={pet_id}")
    return Response(status_code=204)