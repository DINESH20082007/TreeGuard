from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RecoveryActionItem(BaseModel):
    id: Optional[str] = None
    label: str
    note: Optional[str] = None
    status: str = "pending"  # "pending", "in-progress", "completed"
    assignee: Optional[str] = None
    due: Optional[str] = None
    completed_date: Optional[str] = None

class RecoveryTimelineItem(BaseModel):
    date: str
    event: str
    desc: str
    type: str  # "created", "assigned", "completed", "scheduled"

class RecoveryPlanCreateRequest(BaseModel):
    tree_id: str
    priority: str = "Medium"
    severity: str = "Moderate"
    assigned_inspector_name: Optional[str] = "Marcus Johnson"
    detected_issue: Optional[str] = "Potential drought stress (AI assessment)"
    ai_assessment: Optional[str] = None
    ai_confidence: Optional[int] = 82
    actions: List[RecoveryActionItem] = []
    target_date: Optional[str] = None
    reinspection_date: Optional[str] = None
    notes: Optional[str] = None

class RecoveryPlanUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    severity: Optional[str] = None
    assigned_inspector_name: Optional[str] = None
    actions: Optional[List[RecoveryActionItem]] = None
    target_date: Optional[str] = None
    reinspection_date: Optional[str] = None
    notes: Optional[str] = None

class RecoveryPlanResponse(BaseModel):
    id: str
    tree_id: str
    tree_species: Optional[str] = None
    tree_common_name: Optional[str] = None
    tree_location: Optional[str] = None
    tree_image_url: Optional[str] = None
    tree_health_score: Optional[int] = None
    tree_status: Optional[str] = None
    creator_id: str
    assigned_inspector_id: Optional[str] = None
    assigned_inspector_name: Optional[str] = None
    status: str
    priority: str
    severity: str
    detected_issue: str
    ai_assessment: Optional[str] = None
    ai_confidence: Optional[int] = None
    actions: List[RecoveryActionItem] = []
    target_date: Optional[str] = None
    reinspection_date: Optional[str] = None
    notes: Optional[str] = None
    timeline: List[RecoveryTimelineItem] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
