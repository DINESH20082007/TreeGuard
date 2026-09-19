from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"

    id = Column(String(36), primary_key=True)  # e.g. RSH-2026-xxxx or uuid
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)
    stage_name = Column(String(100), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<ReportStatusHistory(id={self.id}, report_id={self.report_id}, stage_name={self.stage_name}, status={self.status})>"

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True)  # e.g. TRG-2026-0107
    reporter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tree_id = Column(String(36), ForeignKey("trees.id", ondelete="SET NULL"), nullable=True, index=True)
    
    issue_type = Column(String(50), nullable=False, index=True)  # health, fallen, branch, trunk, storm, blocking, infrastructure, other
    description = Column(Text, nullable=True)
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=False)
    priority = Column(String(20), nullable=False, default="Medium")  # High, Medium, Low
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, under-review, assigned, in-progress, inspection-completed, service-required, service-in-progress, service-completed, follow-up-required, resolved, rejected
    observed_at = Column(String(100), nullable=True)
    additional_notes = Column(Text, nullable=True)

    # Lifecycle Milestones & Inspector Assignment
    assigned_inspector_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_inspector_name = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    inspection_started_at = Column(DateTime(timezone=True), nullable=True)
    inspection_completed_at = Column(DateTime(timezone=True), nullable=True)
    service_started_at = Column(DateTime(timezone=True), nullable=True)
    service_completed_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    work_performed = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    reporter = relationship("User", foreign_keys=[reporter_id], backref="reports")
    assigned_inspector = relationship("User", foreign_keys=[assigned_inspector_id])
    tree = relationship("Tree", backref="reports")
    status_history = relationship(
        "ReportStatusHistory",
        backref="report",
        order_by="ReportStatusHistory.created_at.asc()",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<Report(id={self.id}, issue_type={self.issue_type}, status={self.status}, reporter_id={self.reporter_id})>"
