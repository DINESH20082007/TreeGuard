import json
from typing import Optional, Literal, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

RoleType = Literal["citizen", "inspector", "admin"]

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: RoleType = "citizen"

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        name = v.strip()
        if not name:
            raise ValueError("Full name cannot be empty")
        return name

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    role: str
    phone_number: Optional[str] = None
    primary_district: Optional[str] = "RS Puram, Coimbatore"
    avatar_url: Optional[str] = None
    is_client_presentation: bool = False
    can_access_all_dashboards: bool = False
    is_active: bool
    created_at: datetime

    @field_validator("can_access_all_dashboards", mode="before")
    @classmethod
    def set_access_flags(cls, v, info):
        # Default can_access_all_dashboards to True if is_client_presentation is true
        return v or False

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    role: str
    phone_number: Optional[str] = None
    primary_district: Optional[str] = "RS Puram, Coimbatore"
    avatar_url: Optional[str] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    privacy_settings: Optional[Dict[str, Any]] = None
    member_since: str
    is_client_presentation: bool = False
    can_access_all_dashboards: bool = False
    is_active: bool
    created_at: datetime

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=50)
    primary_district: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    notification_preferences: Optional[Dict[str, Any]] = None
    privacy_settings: Optional[Dict[str, Any]] = None

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            name = v.strip()
            if not name:
                raise ValueError("Full name cannot be empty")
            return name
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class MessageResponse(BaseModel):
    message: str
