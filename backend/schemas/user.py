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

    model_config = ConfigDict(
        from_attributes = True,
        json_schema_extra = {
            "example": {
                "id": 1,
                "username": "alex_kanton",
                "email": "alex_kanton@example.com"
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