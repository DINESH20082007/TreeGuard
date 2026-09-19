from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True)  # e.g. NTF-2026-0084
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type = Column(String(50), nullable=False, default="system", index=True)  # emergency, update, assignment, resolved, alert, system
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, nullable=False, default=False, index=True)

    related_entity_type = Column(String(50), nullable=True)  # report, emergency, tree, assignment, recovery_plan
    related_entity_id = Column(String(36), nullable=True)

    priority = Column(String(20), nullable=True, default="normal")  # normal, high, urgent

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, read={self.read})>"
