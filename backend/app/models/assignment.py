from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Assignment(Base):
    __tablename__ = "inspector_assignments"

    id = Column(String(36), primary_key=True)  # e.g. TRG-2026-0084 or ASN-2026-0084
    inspector_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True, index=True)
    tree_id = Column(String(36), ForeignKey("trees.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(255), nullable=False)  # e.g. "Trunk damage — co-dominant stem failure"
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)

    priority = Column(String(20), nullable=False, default="Medium")  # Emergency, High, Medium, Low
    status = Column(String(50), nullable=False, default="assigned", index=True)  # assigned, in-progress, completed, pending, under-review, emergency

    # Inspection & Service Lifecycle Statuses
    inspection_status = Column(String(50), nullable=False, default="Assigned")  # Assigned, In Progress, Inspection Completed, Follow-up Required
    service_required = Column(Boolean, nullable=False, default=False)
    service_status = Column(String(50), nullable=False, default="Not Required")  # Not Required, Required, Service In Progress, Service Completed
    service_performed = Column(String(255), nullable=True)
    service_notes = Column(Text, nullable=True)
    service_completed_at = Column(DateTime(timezone=True), nullable=True)
    inspection_started_at = Column(DateTime(timezone=True), nullable=True)
    inspection_completed_at = Column(DateTime(timezone=True), nullable=True)

    ai_assessment = Column(Text, nullable=True)  # e.g. "Structural risk — high confidence (89%)"
    notes = Column(Text, nullable=True)

    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    inspector = relationship("User", backref="assignments")
    report = relationship("Report", backref="assignments")
    tree = relationship("Tree", backref="assignments")

    def __repr__(self):
        return f"<Assignment(id={self.id}, inspector_id={self.inspector_id}, inspection_status={self.inspection_status}, service_status={self.service_status})>"
