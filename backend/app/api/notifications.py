from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    MarkAllReadResponse,
)
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get authenticated user's notifications"
)
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the complete list of notifications for the authenticated user in reverse chronological order.
    """
    return await notification_service.get_user_notifications(db, current_user)

@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notifications count"
)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the count of unread notifications for the authenticated user.
    """
    return await notification_service.get_unread_count(db, current_user.id)

@router.patch(
    "/read-all",
    response_model=MarkAllReadResponse,
    summary="Mark all authenticated user's notifications as read"
)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks all unread notifications of the authenticated user as read.
    """
    return await notification_service.mark_all_as_read(db, current_user)

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a single notification as read"
)
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks a specific notification as read, ensuring ownership validation.
    """
    return await notification_service.mark_notification_as_read(db, current_user, notification_id)
