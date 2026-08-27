from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models.models import User, Pet
from schemas.pet import PetCreate, PetUpdate, PetResponse
from utils.security import get_current_user
from utils.exceptions import BadRequestException, NotFoundException
from utils.photos import save_photo, delete_photo_file
from utils.weight import sync_checkin
from datetime import date

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
    db.flush()
    sync_checkin(db, pet, date.today())
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
    sync_checkin(db, pet, date.today())
    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}", status_code=204)
def delete_pet(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a specific pet by ID."""
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    delete_photo_file(pet.photo_filename)
    for record in pet.records:
        for photo in record.photos:
            delete_photo_file(photo.filename)
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

    # Validate the uploaded file and save it
    name = save_photo(file)
    delete_photo_file(pet.photo_filename)
    pet.photo_filename = name
    db.commit()
    db.refresh(pet)
    return pet

@router.delete("/{pet_id}/photo", response_model=PetResponse)
def delete_photo(pet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise NotFoundException("Pet", pet_id)
    if not pet.photo_filename:
        raise BadRequestException("This pet has no photo.", code="no_pet_photo")
    delete_photo_file(pet.photo_filename)
    pet.photo_filename = None
    db.commit()
    db.refresh(pet)
    return pet