from fastapi import APIRouter, Depends, status, Request, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import date, timedelta
from zoneinfo import available_timezones

from utils.exceptions import BadRequestException, DuplicateException, NotFoundException, UnauthorizedException
from database import get_db
from models.models import User
from schemas.user import ChangeEmailRequest, ChangePasswordRequest, DeleteAccountRequest, ForgotPasswordRequest, RegisterRequest, LoginRequest, ResetPasswordRequest, TokenResponse, UserResponse, UserUpdateRequest, VerifyRequest
from utils.security import hash_password, verify_password, create_access_token, get_current_user, create_purpose_token, decode_purpose_token, password_fingerprint
from utils.mailer import send_verification_email, send_reset_email, send_email_changed_email, send_password_changed_email
from utils.photos import save_photo, delete_photo_file
from utils.weight import sync_checkin
from utils.limiter import limiter
from config import settings


# Router for authentication-related endpoints
router = APIRouter(prefix="/auth", tags=["Authentication"])


# Authentication endpoints for user registration, login, and retrieving the current user
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED,
    responses={
        422: {"description": "Validation Error"},
        409: {"description": "Email already registered"},
        429: {"description": "Too many requests"},
    },
    summary="Create a new user account and return an access token",
)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Create a new user account and return an access token.

    - The password is hashed before storing in the database.
    - Returns a JWT access token upon successful registration.
    """

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        timezone=payload.timezone or settings.TIMEZONE,
        language=payload.language or "en",
    )

    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateException("User", "email", payload.email)
    db.refresh(user)

    # Create an access token for the newly registered user
    token = create_access_token(data={"sub": str(user.id), "fp": password_fingerprint(user.hashed_password)})

    # Send a verification email in the background
    verify_token = create_purpose_token(user.id, "verify", timedelta(hours=24))
    background_tasks.add_task(send_verification_email, user.email, verify_token, user.language)

    return{
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/login", response_model=TokenResponse, description="Login using email instead of username",
    responses={
        422: {"description": "Validation Error"},
        401: {"description": "Invalid email or password"},
        429: {"description": "Too many requests"},
    },
    summary="Login using email and password and return an access token",
)
@limiter.limit("10/minute")
def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Login using email and password and return an access token.

    - This endpoint authenticates the user and returns a JWT access token upon successful login.
    -Raises a 401 error if the email or password is invalid.
    """

    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password", code="invalid_credentials")
    
    token = create_access_token(data={"sub": str(user.id), "fp": password_fingerprint(user.hashed_password)})

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/verify-email", response_model=UserResponse)
@limiter.limit("10/minute")
def verify_email(request: Request, payload: VerifyRequest, db: Session = Depends(get_db)):
    """Verify an address. A staged email change is applied here, not when it was requested."""
    user_id = int(decode_purpose_token(payload.token, "verify")["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User", user_id)
    if user.pending_email:
        claimed = user.pending_email
        user.email = claimed
        user.pending_email = None
        user.email_verified = True
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise DuplicateException("User", "email", claimed)
        db.refresh(user)
        return user
    if user.email_verified:
        return user  # Already verified
    user.email_verified = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/resend-verification", status_code=204)
@limiter.limit("3/hour")
def resend_verification(request: Request, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Send a fresh verification email, to the pending address when a change is staged."""
    target = current_user.pending_email or current_user.email
    if not current_user.pending_email and current_user.email_verified:
        raise BadRequestException("Email already verified", code="email_already_verified")
    verify_token = create_purpose_token(current_user.id, "verify", timedelta(hours=24))
    background_tasks.add_task(send_verification_email, target, verify_token, current_user.language)
    return

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the signed-in user."""
    return current_user

@router.post("/forgot-password", status_code=204)
@limiter.limit("3/hour")
def forgot_password(request: Request, payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Email a reset link. Always returns 204, whether or not the address is registered."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        fp = password_fingerprint(user.hashed_password)
        token = create_purpose_token(user.id, "reset", timedelta(minutes=15), {"fp": fp})
        background_tasks.add_task(send_reset_email, user.email, token, user.language)
    return


@router.post("/reset-password", status_code=204)
@limiter.limit("10/hour")
def reset_password(request: Request, payload: ResetPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Set a new password from a signed reset link."""
    claims = decode_purpose_token(payload.token, "reset")
    user_id = int(claims["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User", user_id)
    if claims.get("fp") != password_fingerprint(user.hashed_password):
        raise BadRequestException("This link has already been used.", code="link_already_used")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    db.refresh(user)
    background_tasks.add_task(send_password_changed_email, user.email, user.language)
    return

@router.post("/change-email", response_model=UserResponse)
@limiter.limit("5/hour")
def change_email(request: Request, payload: ChangeEmailRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Stage an email change. The address only moves once the new one is verified."""
    if not verify_password(payload.password, current_user.hashed_password):
        raise UnauthorizedException("Incorrect password.", code="incorrect_password")
    if payload.email == current_user.email:
        raise BadRequestException("The new email cannot be the same as the current email.", code="email_unchanged")
    if db.query(User).filter(User.email == payload.email).first():
        raise DuplicateException("User", "email", payload.email)
    current_user.pending_email = payload.email
    db.commit()
    db.refresh(current_user)
    verify_token = create_purpose_token(current_user.id, "verify", timedelta(hours=24))
    background_tasks.add_task(send_verification_email, payload.email, verify_token, current_user.language)
    background_tasks.add_task(send_email_changed_email, current_user.email, payload.email, current_user.language)
    return current_user

@router.post("/change-password", response_model=TokenResponse)
@limiter.limit("5/hour")
def change_password(request: Request, payload: ChangePasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Change the signed-in user's password and hand back a fresh token."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise UnauthorizedException("Incorrect password.", code="incorrect_password")
    if payload.new_password == payload.current_password:
        raise BadRequestException("The new password cannot be the same as the current password.", code="password_unchanged")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    db.refresh(current_user)
    background_tasks.add_task(send_password_changed_email, current_user.email, current_user.language)
    token = create_access_token(data={"sub": str(current_user.id), "fp": password_fingerprint(current_user.hashed_password)})
    return {"access_token": token, "token_type": "bearer"}


@router.delete("/me", status_code=204)
@limiter.limit("5/hour")
def delete_account(request: Request, payload: DeleteAccountRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Permanently delete the signed-in user and everything they own."""
    if not verify_password(payload.password, current_user.hashed_password):
        raise UnauthorizedException("Incorrect password.", code="incorrect_password")
    db.delete(current_user)
    delete_photo_file(current_user.photo_filename)
    for pet in current_user.pets:
        delete_photo_file(pet.photo_filename)
        for record in pet.records:
            for photo in record.photos:
                delete_photo_file(photo.filename)
    db.commit()
    return

@router.patch("/me", response_model=UserResponse)
def update_me(payload: UserUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update the user's email preferences."""
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    if payload.weight_tracking_enabled is False:
        for pet in current_user.pets:
            pet.weight_tracking_enabled = False
    if payload.walk_tracking_enabled is False:
        for pet in current_user.pets:
            pet.walk_tracking_enabled = False
    for pet in current_user.pets:
        sync_checkin(db, pet, date.today())
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/photo", response_model=UserResponse)
def upload_my_photo(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Attach or replace the signed-in user's avatar."""
    name = save_photo(file)
    delete_photo_file(current_user.photo_filename)
    current_user.photo_filename = name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/photo", response_model=UserResponse)
def delete_my_photo(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove the signed-in user's avatar."""
    if not current_user.photo_filename:
        raise BadRequestException("You have no photo.", code="no_user_photo")
    delete_photo_file(current_user.photo_filename)
    current_user.photo_filename = None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/timezones", response_model=list[str])
def list_timezones(current_user: User = Depends(get_current_user)):
    """The IANA zones this server accepts, from the same tzdata the reminder job uses."""
    return sorted(available_timezones())