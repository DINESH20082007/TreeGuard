from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ObservationCreateRequest(BaseModel):
    tree_id: str = Field(..., description="ID of the tree being observed, e.g. TRE-0481")
    assignment_id: Optional[str] = Field(None, description="Optional related assignment ID")
    recovery_plan_id: Optional[str] = Field(None, description="Optional related recovery plan ID")
    
    condition: Optional[str] = Field("Fair", description="Observed condition: Good, Fair, Poor, Critical")
    health_score: Optional[int] = Field(None, ge=0, le=100, description="Assessed or computed health score (0-100)")
    image_url: Optional[str] = Field(None, description="Photo URL of observation")
    
    notes: Optional[str] = Field(None, description="Field notes and observational details")
    recommendations: Optional[str] = Field(None, description="Recommended next actions")
    canopy_condition: Optional[str] = Field(None, description="Canopy health notes")
    structural_condition: Optional[str] = Field(None, description="Trunk and structural notes")
    severity: Optional[str] = Field("Moderate", description="Low, Moderate, Severe, Critical")
    
    follow_up_required: Optional[bool] = Field(False, description="Whether follow-up monitoring is needed")
    next_follow_up_date: Optional[str] = Field(None, description="Scheduled date for next observation/reinspection")
    plan_status_update: Optional[str] = Field(None, description="Status update for recovery plan if applicable")
    
    ai_assessment: Optional[str] = Field(None, description="AI assessment notes")
    ai_confidence: Optional[int] = Field(84, description="AI comparison confidence percentage")

class ObservationUpdateRequest(BaseModel):
    condition: Optional[str] = None
    health_score: Optional[int] = None
    notes: Optional[str] = None
    recommendations: Optional[str] = None
    next_follow_up_date: Optional[str] = None
    plan_status_update: Optional[str] = None

class ObservationComparisonResponse(BaseModel):
    tree_id: str
    tree_species: str
    tree_common_name: str
    tree_location: str
    previous_score: Optional[int] = None
    current_score: Optional[int] = None
    score_change: Optional[int] = None
    change_category: str  # improved, stable, deterioration, inconclusive
    label: str
    label_color: str
    bg_color: str
    border_color: str
    observation_summary: str
    next_action: str
    ai_confidence: int
    previous_date: Optional[str] = None
    current_date: Optional[str] = None
    previous_image_url: Optional[str] = None
    current_image_url: Optional[str] = None

class ObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tree_id: str
    tree_species: Optional[str] = None
    tree_common_name: Optional[str] = None
    tree_location_name: Optional[str] = None

    inspector_id: str
    inspector_name: str
    assignment_id: Optional[str] = None
    recovery_plan_id: Optional[str] = None

    observation_date: datetime
    image_url: Optional[str] = None

    condition: str
    health_score: Optional[int] = None
    previous_health_score: Optional[int] = None
    score_change: Optional[int] = None
    change_category: Optional[str] = None

    canopy_condition: Optional[str] = None
    structural_condition: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None
    recommendations: Optional[str] = None

    ai_assessment: Optional[str] = None
    ai_confidence: Optional[int] = None

    follow_up_required: bool
    next_follow_up_date: Optional[str] = None
    plan_status_update: Optional[str] = None

    created_at: datetime
    updated_at: datetime
