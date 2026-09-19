from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime
from app.database import Base

class Tree(Base):
    __tablename__ = "trees"

    id = Column(String(36), primary_key=True)  # e.g. TRE-0481
    species = Column(String(100), nullable=False)
    common_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="healthy", index=True)  # healthy, monitoring, at-risk, emergency
    health_score = Column(Integer, nullable=False, default=100)
    health_confidence = Column(Integer, nullable=True, default=85)
    image_url = Column(String(500), nullable=True)
    location_name = Column(String(255), nullable=False)
    last_inspection = Column(String(100), nullable=False)
    height_m = Column(Float, nullable=True)
    canopy_spread_m = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<Tree(id={self.id}, species={self.species}, status={self.status}, lat={self.latitude}, lng={self.longitude})>"
