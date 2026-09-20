from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.rate_limit import rate_limit_auth
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_auth)],
    summary="Register a new user account"
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.
    Validates name, normalized email, password, and role.
    Does NOT automatically log the user in.
    """
    user = await auth_service.register_user(db, data)
    return user

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth)],
    summary="Authenticate with email and password"
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate a user by email and password.
    Returns JWT access token and user information.
    """
    user = await auth_service.authenticate_user(db, data.email, data.password)
    access_token = auth_service.create_access_token(user, remember_me=data.remember_me)
    is_client = bool(getattr(user, "is_client_presentation", False) or user.email == "client@treeguard.org")
    user_resp = UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        phone_number=user.phone_number,
        primary_district=user.primary_district or "RS Puram, Coimbatore",
        avatar_url=user.avatar_url,
        is_client_presentation=is_client,
        can_access_all_dashboards=is_client,
        is_active=user.is_active,
        created_at=user.created_at,
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user summary"
)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Returns basic user details for the authenticated session.
    """
    is_client = bool(getattr(current_user, "is_client_presentation", False) or current_user.email == "client@treeguard.org")
    return UserResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role,
        phone_number=current_user.phone_number,
        primary_district=current_user.primary_district or "RS Puram, Coimbatore",
        avatar_url=current_user.avatar_url,
        is_client_presentation=is_client,
        can_access_all_dashboards=is_client,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )

@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout user session"
)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Acknowledge user logout and session termination.
    """
    return MessageResponse(message="Successfully signed out.")

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth)],
    summary="Request password reset link"
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates password reset flow.
    Always returns generic message to prevent email enumeration.
    """
    await auth_service.forgot_password(db, data.email)
    return MessageResponse(
        message="If an account exists for this email, a password reset link has been sent."
    )

@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth)],
    summary="Reset password using reset token"
)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates single-use reset token and sets new password.
    """
    await auth_service.reset_password(db, data.token, data.new_password)
    return MessageResponse(
        message="Your password has been reset. Please sign in."
    )
