from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Observation(Base):
    __tablename__ = "observations"

    id = Column(String(36), primary_key=True)  # e.g. OBS-2026-0084
    tree_id = Column(String(36), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_name = Column(String(255), nullable=False, default="Field Inspector")
    
    assignment_id = Column(String(36), ForeignKey("inspector_assignments.id", ondelete="SET NULL"), nullable=True, index=True)
    recovery_plan_id = Column(String(36), ForeignKey("recovery_plans.id", ondelete="SET NULL"), nullable=True, index=True)

    observation_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    image_url = Column(String(500), nullable=True)

    # Condition & scores
    condition = Column(String(50), nullable=False, default="Fair")  # Good, Fair, Poor, Critical
    health_score = Column(Integer, nullable=True)  # 0-100
    previous_health_score = Column(Integer, nullable=True)
    score_change = Column(Integer, nullable=True)  # difference (e.g. -32, +12, 0)
    change_category = Column(String(50), nullable=True, default="stable")  # improved, stable, deterioration, inconclusive

    # Observational findings
    canopy_condition = Column(String(100), nullable=True)
    structural_condition = Column(String(100), nullable=True)
    severity = Column(String(50), nullable=True, default="Moderate")  # Low, Moderate, Severe, Critical
    notes = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)

    # AI Comparison / Assessment fields
    ai_assessment = Column(Text, nullable=True)
    ai_confidence = Column(Integer, nullable=True, default=84)

    # Follow-up & Recovery tracking
    follow_up_required = Column(Boolean, default=False, nullable=False)
    next_follow_up_date = Column(String(50), nullable=True)
    plan_status_update = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tree = relationship("Tree", backref="observations")
    inspector = relationship("User", backref="observations")
    assignment = relationship("Assignment", backref="observations")
    recovery_plan = relationship("RecoveryPlan", backref="observations")

    def __repr__(self):
        return f"<Observation(id={self.id}, tree_id={self.tree_id}, condition={self.condition}, health_score={self.health_score})>"
