from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class RecoveryPlan(Base):
    __tablename__ = "recovery_plans"

    id = Column(String(36), primary_key=True)  # e.g. REC-2026-0084
    tree_id = Column(String(36), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False, index=True)
    creator_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_inspector_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_inspector_name = Column(String(255), nullable=True, default="Marcus Johnson")

    status = Column(String(50), nullable=False, default="In Progress", index=True)  # Active, In Progress, Completed, Draft, Cancelled
    priority = Column(String(20), nullable=False, default="Medium")  # Low, Medium, High, Urgent
    severity = Column(String(20), nullable=False, default="Moderate")  # Low, Moderate, Severe, Critical

    detected_issue = Column(String(255), nullable=False, default="Potential drought stress")
    ai_assessment = Column(Text, nullable=True)
    ai_confidence = Column(Integer, nullable=True, default=82)

    # JSON-encoded list of action items: [{id, label, note, status, assignee, due, completed_date}]
    actions = Column(Text, nullable=False, default="[]")

    target_date = Column(String(50), nullable=True)
    reinspection_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # JSON-encoded list of timeline events: [{date, event, desc, type}]
    timeline = Column(Text, nullable=True, default="[]")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tree = relationship("Tree", backref="recovery_plans")
    creator = relationship("User", foreign_keys=[creator_id], backref="created_recovery_plans")
    assigned_inspector = relationship("User", foreign_keys=[assigned_inspector_id], backref="assigned_recovery_plans")

    def __repr__(self):
        return f"<RecoveryPlan(id={self.id}, tree_id={self.tree_id}, status={self.status}, priority={self.priority})>"
