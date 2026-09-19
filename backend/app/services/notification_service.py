import logging
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, func, update, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    MarkAllReadResponse,
)

logger = logging.getLogger("treeguard.notifications")

class NotificationService:
    @staticmethod
    def _generate_notification_id() -> str:
        year = datetime.now(timezone.utc).year
        num = random.randint(1000, 9999)
        return f"NTF-{year}-{num}"

    @staticmethod
    def _format_time_ago(dt: datetime) -> str:
        if not dt:
            return "Recently"
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        diff = now - dt
        total_seconds = int(diff.total_seconds())

        if total_seconds < 60:
            return "Just now"
        elif total_seconds < 3600:
            mins = max(1, total_seconds // 60)
            return f"{mins} min ago" if mins == 1 else f"{mins} mins ago"
        elif total_seconds < 86400:
            hrs = max(1, total_seconds // 3600)
            return f"{hrs} hr ago" if hrs == 1 else f"{hrs} hrs ago"
        elif total_seconds < 172800:
            return f"Yesterday, {dt.strftime('%I:%M %p').lstrip('0')}"
        else:
            return dt.strftime("%b %d, %Y")

    @classmethod
    def _to_response(cls, n: Notification) -> NotificationResponse:
        return NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            type=n.type,
            title=n.title,
            message=n.message,
            read=n.read,
            time=cls._format_time_ago(n.created_at),
            related_entity_type=n.related_entity_type,
            related_entity_id=n.related_entity_id,
            priority=n.priority or "normal",
            created_at=n.created_at,
        )

    @classmethod
    async def create_notification(
        cls,
        db: AsyncSession,
        user_id: str,
        type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        priority: Optional[str] = "normal",
    ) -> NotificationResponse:
        """
        Creates and persists a real notification for a specific user.
        """
        notif_id = cls._generate_notification_id()
        for _ in range(5):
            chk = await db.execute(select(Notification).where(Notification.id == notif_id))
            if not chk.scalar_one_or_none():
                break
            notif_id = cls._generate_notification_id()

        notif = Notification(
            id=notif_id,
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            read=False,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            priority=priority or "normal",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        db.add(notif)
        await db.commit()
        await db.refresh(notif)

        logger.info(f"Created notification {notif.id} for user {user_id} ({type}: {title})")
        return cls._to_response(notif)

    @classmethod
    async def get_user_notifications(
        cls,
        db: AsyncSession,
        current_user: User,
    ) -> NotificationListResponse:
        """
        Returns all notifications belonging strictly to the authenticated user.
        """
        stmt = (
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(desc(Notification.created_at))
        )
        res = await db.execute(stmt)
        notifs = list(res.scalars().all())

        if not notifs:
            # Seed initial realistic notifications for this user account if none exist
            notifs = await cls._seed_initial_notifications_for_user(db, current_user)

        unread_count = sum(1 for n in notifs if not n.read)
        items = [cls._to_response(n) for n in notifs]

        return NotificationListResponse(
            notifications=items,
            unread_count=unread_count,
            total_count=len(items),
        )

    @classmethod
    async def get_unread_count(
        cls,
        db: AsyncSession,
        user_id: str,
    ) -> UnreadCountResponse:
        """
        Fast count query for user's unread notifications.
        """
        stmt = (
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id, Notification.read == False)
        )
        res = await db.execute(stmt)
        count = res.scalar() or 0
        return UnreadCountResponse(unread_count=count)

    @classmethod
    async def mark_notification_as_read(
        cls,
        db: AsyncSession,
        current_user: User,
        notification_id: str,
    ) -> NotificationResponse:
        """
        Marks a specific notification as read, enforcing user ownership.
        """
        stmt = select(Notification).where(Notification.id == notification_id)
        res = await db.execute(stmt)
        notif = res.scalar_one_or_none()

        if not notif:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification with ID '{notification_id}' not found."
            )

        if notif.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this notification."
            )

        if not notif.read:
            notif.read = True
            notif.updated_at = datetime.now(timezone.utc)
            db.add(notif)
            await db.commit()
            await db.refresh(notif)

        return cls._to_response(notif)

    @classmethod
    async def mark_all_as_read(
        cls,
        db: AsyncSession,
        current_user: User,
    ) -> MarkAllReadResponse:
        """
        Marks all unread notifications of the current authenticated user as read.
        """
        stmt = (
            update(Notification)
            .where(Notification.user_id == current_user.id, Notification.read == False)
            .values(read=True, updated_at=datetime.now(timezone.utc))
        )
        res = await db.execute(stmt)
        await db.commit()
        updated_count = res.rowcount if hasattr(res, "rowcount") else 0

        return MarkAllReadResponse(
            updated_count=updated_count,
            message=f"Marked {updated_count} notifications as read."
        )

    @classmethod
    async def _seed_initial_notifications_for_user(
        cls,
        db: AsyncSession,
        user: User,
    ) -> List[Notification]:
        """
        Seeds realistic role-specific baseline notifications for newly registered users.
        """
        now = datetime.now(timezone.utc)
        prefix = user.id[:4].upper()

        if user.role == "inspector":
            seed_data = [
                {
                    "id": f"NTF-{prefix}-001",
                    "type": "emergency",
                    "title": "Emergency dispatch near your sector",
                    "message": "Fallen tree hazard verified at DB Road, RS Puram, Coimbatore. Assigned to high-priority field response queue.",
                    "read": False,
                    "created_at": now - timedelta(minutes=15),
                    "related_entity_type": "assignment",
                    "related_entity_id": f"ASN-{user.id[:6].upper()}-0107",
                    "priority": "urgent",
                },
                {
                    "id": f"NTF-{prefix}-002",
                    "type": "assignment",
                    "title": "New field inspection assigned",
                    "message": "You have been assigned to inspect trunk damage and structural stability at Race Course Road Promenade, Coimbatore.",
                    "read": False,
                    "created_at": now - timedelta(hours=2),
                    "related_entity_type": "assignment",
                    "related_entity_id": f"ASN-{user.id[:6].upper()}-0084",
                    "priority": "high",
                },
                {
                    "id": f"NTF-{prefix}-003",
                    "type": "alert",
                    "title": "Tree health alert — TRE-0481",
                    "message": "A tree in your sector (RS Puram, Coimbatore) has been flagged for follow-up observation by AI risk prediction.",
                    "read": False,
                    "created_at": now - timedelta(hours=5),
                    "related_entity_type": "tree",
                    "related_entity_id": "TRE-0481",
                    "priority": "normal",
                },
                {
                    "id": f"NTF-{prefix}-004",
                    "type": "system",
                    "title": "Field operations active",
                    "message": "Welcome to TreeGuard Field Operations. Your assigned district: RS Puram & Race Course Zone, Coimbatore.",
                    "read": True,
                    "created_at": now - timedelta(days=1),
                    "related_entity_type": "system",
                    "related_entity_id": None,
                    "priority": "normal",
                },
            ]
        else:
            # Citizen / Default
            seed_data = [
                {
                    "id": f"NTF-{prefix}-001",
                    "type": "emergency",
                    "title": "Emergency reported near you",
                    "message": "A fallen tree emergency has been reported on DB Road, RS Puram, Coimbatore, 380m from your location.",
                    "read": False,
                    "created_at": now - timedelta(minutes=4),
                    "related_entity_type": "tree",
                    "related_entity_id": "TRE-0481",
                    "priority": "urgent",
                },
                {
                    "id": f"NTF-{prefix}-002",
                    "type": "update",
                    "title": "Report TRG-2026-0091 updated",
                    "message": "An inspector has been assigned to your broken branch report. Estimated response: 2–3 business days.",
                    "read": False,
                    "created_at": now - timedelta(hours=1),
                    "related_entity_type": "report",
                    "related_entity_id": "TRG-2026-0091",
                    "priority": "normal",
                },
                {
                    "id": f"NTF-{prefix}-003",
                    "type": "alert",
                    "title": "Tree health alert — TRE-0481",
                    "message": "A nearby tree (DB Road, RS Puram) has been flagged as At Risk based on recent AI assessment.",
                    "read": False,
                    "created_at": now - timedelta(hours=3),
                    "related_entity_type": "tree",
                    "related_entity_id": "TRE-0481",
                    "priority": "normal",
                },
                {
                    "id": f"NTF-{prefix}-004",
                    "type": "resolved",
                    "title": "Report TRG-2026-0063 resolved",
                    "message": "Your storm damage report has been resolved. The affected tree on NSR Road, Saibaba Colony has been made safe.",
                    "read": True,
                    "created_at": now - timedelta(days=1, hours=3),
                    "related_entity_type": "report",
                    "related_entity_id": "TRG-2026-0063",
                    "priority": "normal",
                },
                {
                    "id": f"NTF-{prefix}-005",
                    "type": "system",
                    "title": "TreeGuard weekly digest",
                    "message": "3 new trees added to monitoring in your area. 1 emergency resolved within 3 hours this week.",
                    "read": True,
                    "created_at": now - timedelta(days=3),
                    "related_entity_type": "system",
                    "related_entity_id": None,
                    "priority": "normal",
                },
            ]

        created_notifs = []
        for d in seed_data:
            n = Notification(
                id=d["id"],
                user_id=user.id,
                type=d["type"],
                title=d["title"],
                message=d["message"],
                read=d["read"],
                related_entity_type=d.get("related_entity_type"),
                related_entity_id=d.get("related_entity_id"),
                priority=d.get("priority", "normal"),
                created_at=d["created_at"],
                updated_at=d["created_at"],
            )
            db.add(n)
            created_notifs.append(n)

        try:
            await db.commit()
            for n in created_notifs:
                await db.refresh(n)
            return created_notifs
        except Exception as e:
            logger.warning(f"Failed to commit seeded notifications: {e}")
            await db.rollback()
            return []

notification_service = NotificationService()
