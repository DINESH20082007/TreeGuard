from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    ChangePasswordRequest,
    MessageResponse,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/users", tags=["Users"])

@router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user's full profile"
)
async def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Returns complete profile details for the authenticated user from PostgreSQL.
    """
    return auth_service.get_user_profile(current_user)

@router.patch(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile"
)
async def update_my_profile(
    data: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates allowed profile information (name, phone, district, avatar, preferences)
    for the authenticated user. Role and email cannot be changed here.
    """
    return await auth_service.update_user_profile(db, current_user, data)

@router.put(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile (PUT alias)"
)
async def update_my_profile_put(
    data: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await auth_service.update_user_profile(db, current_user, data)

@router.post(
    "/me/change-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change password for current user"
)
async def change_my_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies existing password and securely updates to new password in PostgreSQL.
    """
    await auth_service.change_user_password(db, current_user, data.current_password, data.new_password)
    return MessageResponse(message="Password successfully updated.")

@router.patch(
    "/me/password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change password alias"
)
async def change_my_password_patch(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await auth_service.change_user_password(db, current_user, data.current_password, data.new_password)
    return MessageResponse(message="Password successfully updated.")
