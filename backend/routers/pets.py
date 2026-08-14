import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, Pet
from schemas.pet import PetCreate, PetUpdate, PetResponse
from utils.security import get_current_user
from utils.exceptions import BadRequestException, NotFoundException

from config import settings

# Router setup
router = APIRouter(prefix="/pets", tags=["Pets"])


# Pet endpoints
@router.get("", response_model=list[PetResponse])
def list_pets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all pets for the authenticated user."""
    return db.query(Pet).filter(Pet.user_id == current_user.id).all()


# Create, Read, Update, Delete (CRUD) operations for pets
@router.post("", response_model=PetResponse, status_code=201)
def create_pet(request: PetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new pet for the authenticated user."""
    pet = Pet(**request.model_dump(), user_id=current_user.id)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}", response_model=PetResponse)
def get_pet(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific pet by ID."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    return pet


@router.patch("/{pet_id}", response_model=PetResponse)
def update_pet(pet_id: int, request: PetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a specific pet by ID."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(pet, key, value)
    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=204)
def delete_pet(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a specific pet by ID."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    if pet.photo_filename:
        try:
            os.remove(os.path.join(settings.PHOTO_DIR, pet.photo_filename))
        except FileNotFoundError:
            pass  # If the file doesn't exist, we can ignore it
    db.delete(pet)
    db.commit()
    return Response(status_code=204)

@router.post("/{pet_id}/photo", response_model=PetResponse)
def upload_photo(pet_id: int, file: UploadFile = File(...),
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Attach or replace a pet's photo."""
    # Validate the pet exists and belongs to the current user
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)

    # Validate the uploaded file type and size
    allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

    if file.content_type not in allowed:
        raise BadRequestException("Unsupported image type.")  

    # Read the file data and check its size
    data = file.file.read()
    if len(data) > settings.MAX_PHOTO_MB * 1024 * 1024:
        raise BadRequestException("Image too large.")
    
    
    # Generate a unique filename and save the file to disk
    name = f"{uuid4().hex}{allowed[file.content_type]}"
    with open(os.path.join(settings.PHOTO_DIR, name), "wb") as f:
        f.write(data)

    # if pet.photo_filename is not None, delete the old photo file from disk
    if pet.photo_filename:
        try:
            os.remove(os.path.join(settings.PHOTO_DIR, pet.photo_filename))
        except FileNotFoundError:
            pass  # If the file doesn't exist, we can ignore it
    pet.photo_filename = name
    db.commit()
    db.refresh(pet)
    return pet

