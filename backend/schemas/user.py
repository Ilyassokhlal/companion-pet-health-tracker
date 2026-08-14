from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, Field

# Schemas for the user endpoints
class RegisterRequest(BaseModel):
    """Schema for registering a new user"""
    username: str = Field(
        max_length=36,
        description="The username of the user.",
        examples=["alex_kanton"])
    email: EmailStr = Field(
        description="The email address of the user.",
        examples=["alex_kanton@example.com"])
    password: str = Field(
        min_length=8, max_length=48,
        description="The password of the user.",
        examples=["password123"])
    timezone: str | None = None

class LoginRequest(BaseModel):
    """Schema for user login"""
    email: EmailStr = Field(
        description="The email address of the user.",
        examples=["alex_kanton@example.com"])
    password: str = Field(
        min_length=8, max_length=48,
        description="The password of the user.",
        examples=["password123"])

class UserResponse(BaseModel):
    """Schema for returning user data (no password fields)"""
    id: int
    username: str
    email: EmailStr
    email_verified: bool
    timezone: str
    reminders_enabled: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes = True,
        json_schema_extra = {
            "example": {
                "id": 1,
                "username": "alex_kanton",
                "email": "alex_kanton@example.com",
                "email_verified": True,
                "timezone": "America/Los_Angeles",
                "reminders_enabled": True,
                "created_at": "2024-06-01T12:00:00"
            }
        }
    )

class TokenResponse(BaseModel):
    """Schema for the JWT response."""
    access_token: str
    token_type: str = "bearer"

    model_config = ConfigDict(
        from_attributes = True,
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjg4NzYwMDAwLCJleHAiOjE2ODg3NjM2MDB9.abc123",
                "token_type": "bearer"
            }
        }
    )

class VerifyRequest(BaseModel):
    """Schema for verifying a user's email."""
    token: str

class ForgotPasswordRequest(BaseModel):
    """Schema for requesting a password reset."""
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Schema for resetting a user's password."""
    token: str
    new_password: str = Field(
        min_length=8, max_length=48,
        description="The new password of the user.",
        examples=["newpassword123"])

class ChangeEmailRequest(BaseModel):
    """Schema for changing a user's email."""
    email: EmailStr
    password: str

class DeleteAccountRequest(BaseModel):
    """Schema for deleting a user's account."""
    password: str

class UserUpdateRequest(BaseModel):
    """Schema for updating a user's account settings."""
    reminders_enabled: bool | None = None
    timezone: str | None = None