from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AssignmentResponse(BaseModel):
    id: str
    inspector_id: str
    report_id: Optional[str] = None
    tree_id: Optional[str] = None
    title: str
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    priority: str  # Emergency, High, Medium, Low
    status: str    # assigned, in-progress, completed, pending, under-review, emergency
    inspection_status: str = "Assigned"  # Assigned, In Progress, Inspection Completed, Follow-up Required
    service_required: bool = False
    service_status: str = "Not Required"  # Not Required, Required, Service In Progress, Service Completed
    service_performed: Optional[str] = None
    service_notes: Optional[str] = None
    service_completed_at: Optional[datetime] = None
    work_performed: Optional[str] = None
    completion_notes: Optional[str] = None
    inspection_started_at: Optional[datetime] = None
    inspection_completed_at: Optional[datetime] = None
    ai_assessment: Optional[str] = None
    notes: Optional[str] = None
    assigned_at: datetime
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class InspectorStatsResponse(BaseModel):
    assigned_today: int = 0
    high_priority: int = 0
    pending_inspection: int = 0
    completed_this_week: int = 0
    emergency_cases: int = 0
    service_required: int = 0
    service_in_progress: int = 0
    service_completed: int = 0

class AssignmentListResponse(BaseModel):
    assignments: List[AssignmentResponse]
    stats: InspectorStatsResponse

class AssignmentWorkflowUpdateRequest(BaseModel):
    action: Optional[str] = None  # "start_inspection", "complete_inspection", "follow_up_required", "start_service", "complete_service", "complete_work", "update_service"
    inspection_status: Optional[str] = None  # "Assigned", "In Progress", "Inspection Completed", "Follow-up Required"
    service_required: Optional[bool] = None
    service_status: Optional[str] = None    # "Not Required", "Required", "Service In Progress", "Service Completed"
    condition: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None
    recommended_action: Optional[str] = None
    service_performed: Optional[str] = None
    service_notes: Optional[str] = None
    work_performed: Optional[str] = None
    completion_notes: Optional[str] = None

class InspectionCompleteRequest(BaseModel):
    condition: str
    severity: str
    notes: Optional[str] = None
    recommended_action: Optional[str] = None
    service_required: Optional[bool] = False
    service_status: Optional[str] = "Not Required"
    service_performed: Optional[str] = None
    service_notes: Optional[str] = None

