from datetime import datetime, timedelta, timezone
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from utils.exceptions import BadRequestException, UnauthorizedException
from config import settings
from database import get_db
from models.models import User

import hashlib

# Security utility functions for authentication and password management
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Authentication and password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# Password hashing functions
def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return pwd_context.hash(password)

# Password verification function
def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain, hashed)


# JWT token creation function
def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Current user retrieval function
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Retrieve the current user based on the JWT token."""
    credentials_exception = UnauthorizedException("Could not validate credentials", code="invalid_token")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    # Check if the password fingerprint in the token matches the current password hash
    if payload.get("fp") != password_fingerprint(user.hashed_password):
        raise UnauthorizedException("Session expired, please log in again.", code="session_expired")
    return user

def create_purpose_token(user_id: int, purpose: str, expires: timedelta, extra: dict | None = None) -> str:
    """Sign a short-lived token for a one-off action, e.g. verifying an email."""
    now = datetime.now(timezone.utc)
    expire = now + expires
    to_encode = {"sub": str(user_id), "purpose": purpose, "exp": expire}
    if extra:
        to_encode.update(extra)
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_purpose_token(token: str, purpose: str) -> dict:
    """Return the token payload, or raise if it is invalid, expired, or for another purpose."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != purpose:
            raise BadRequestException("Invalid or expired link.", code="invalid_link")
        user_id = payload.get("sub")
        if user_id is None:
            raise BadRequestException("Invalid or expired link.", code="invalid_link")
        return payload
    except JWTError:
        raise BadRequestException("Invalid or expired link.", code="invalid_link")

def password_fingerprint(hashed_password: str) -> str:
    """Short digest of a password hash, used to make reset links single-use."""
    return hashlib.sha256(hashed_password.encode()).hexdigest()[:16]