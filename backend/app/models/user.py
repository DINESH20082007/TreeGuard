import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="citizen")  # citizen, inspector, admin
    is_active = Column(Boolean, default=True, nullable=False)
    is_client_presentation = Column(Boolean, default=False, nullable=False)

    # Extended Profile Fields
    phone_number = Column(String(50), nullable=True)
    primary_district = Column(String(100), nullable=True, default="RS Puram, Coimbatore")
    avatar_url = Column(String(500), nullable=True)

    # Preferences & Settings (JSON format)
    notification_preferences = Column(
        Text,
        nullable=True,
        default='{"emergencyNearby": true, "reportUpdates": true, "treeAlerts": true, "weeklyDigest": false, "inspectionCompleted": true}'
    )
    privacy_settings = Column(
        Text,
        nullable=True,
        default='{"locationAccess": true, "anonymousReporting": false, "dataUsageAi": true}'
    )

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
