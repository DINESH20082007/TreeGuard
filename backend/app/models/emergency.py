from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class EmergencyAnalysis(Base):
    __tablename__ = "emergency_analyses"

    id = Column(String(36), primary_key=True)  # e.g. EMG-2026-0107
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True, index=True)
    tree_id = Column(String(36), ForeignKey("trees.id", ondelete="SET NULL"), nullable=True, index=True)
    image_url = Column(String(500), nullable=False)
    analysis_status = Column(String(50), nullable=False, default="completed", index=True)  # completed, unavailable, inconclusive, failed
    emergency_detected = Column(Boolean, nullable=False, default=False)
    severity = Column(String(20), nullable=False, default="None")  # High, Medium, Low, None
    confidence = Column(Float, nullable=False, default=0.0)
    detected_issue = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    detected_conditions = Column(Text, nullable=True)  # JSON-encoded array of strings
    risk_factors = Column(Text, nullable=True)         # JSON-encoded array of strings
    is_ai_available = Column(Boolean, nullable=False, default=False)
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="emergency_analyses")
    report = relationship("Report", backref="emergency_analyses")
    tree = relationship("Tree", backref="emergency_analyses")

    def __repr__(self):
        return f"<EmergencyAnalysis(id={self.id}, status={self.analysis_status}, emergency_detected={self.emergency_detected}, severity={self.severity})>"
