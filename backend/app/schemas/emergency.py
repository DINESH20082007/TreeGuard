from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EmergencyAnalysisResponse(BaseModel):
    id: str
    user_id: str
    report_id: Optional[str] = None
    tree_id: Optional[str] = None
    image_url: str
    analysis_status: str  # "completed", "unavailable", "inconclusive", "failed"
    is_ai_available: bool = False
    emergency_detected: bool = False
    severity: str = "None"  # "High", "Medium", "Low", "None", "Unknown"
    confidence: Optional[float] = 0.0
    detected_issue: str
    explanation: str
    recommended_action: str
    detected_conditions: List[str] = []
    risk_factors: List[str] = []
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class EmergencyAnalysisListResponse(BaseModel):
    items: List[EmergencyAnalysisResponse]
    total: int
