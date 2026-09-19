from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

TreeStatus = Literal["healthy", "monitoring", "at-risk", "emergency"]

class TreeBase(BaseModel):
    species: str = Field(..., min_length=2, max_length=100)
    common_name: str = Field(..., min_length=2, max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    status: TreeStatus = "healthy"
    health_score: int = Field(default=100, ge=0, le=100)
    health_confidence: Optional[int] = Field(default=85, ge=0, le=100)
    image_url: Optional[str] = None
    location_name: str = Field(..., min_length=2, max_length=255)
    last_inspection: Optional[str] = "Just reported"
    height_m: Optional[float] = None
    canopy_spread_m: Optional[float] = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError("Latitude must be between -90.0 and 90.0")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError("Longitude must be between -180.0 and 180.0")
        return round(v, 6)

class TreeCreateRequest(TreeBase):
    id: Optional[str] = None  # Optional custom ID like TRE-0481

class TreeResponse(TreeBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TreeListResponse(BaseModel):
    total: int
    trees: list[TreeResponse]

class RiskFactor(BaseModel):
    factor: str
    value: str

class RiskHistoryItem(BaseModel):
    period: str
    risk: str

class TreeRiskResponse(BaseModel):
    tree_id: str
    future_risk: str  # "high", "moderate", "low", "critical", "inconclusive"
    prediction_horizon: str  # e.g., "Next 30 days"
    prediction_confidence: Optional[int] = None  # e.g., 82
    assessment: str  # e.g., "Potential deterioration"
    risk_factors: list[RiskFactor]
    risk_explanation: str
    recommended_action: str
    risk_history: Optional[list[RiskHistoryItem]] = None
    trend: Optional[str] = None
    is_inconclusive: bool = False

