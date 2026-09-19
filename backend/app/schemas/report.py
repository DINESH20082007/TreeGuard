from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict

class ReportBase(BaseModel):
    issue_type: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=2000)
    location_name: str = Field(..., min_length=2, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    priority: str = Field("Medium", max_length=50)
    observed_at: Optional[str] = Field(None, max_length=100)
    additional_notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-90.0 <= v <= 90.0):
            raise ValueError("Latitude must be between -90.0 and 90.0")
        return round(v, 6) if v is not None else None

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-180.0 <= v <= 180.0):
            raise ValueError("Longitude must be between -180.0 and 180.0")
        return round(v, 6) if v is not None else None

class ReportStatusHistoryResponse(BaseModel):
    id: str
    report_id: str
    status: str
    stage_name: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReportTimelineStep(BaseModel):
    label: str
    status: str  # completed, current, pending
    date: Optional[str] = None
    timestamp: Optional[datetime] = None
    note: Optional[str] = None
    done: bool = False

class ReportCreateResponse(BaseModel):
    id: str
    status: str
    created_at: datetime
    image_url: str
    message: str = "Tree report submitted successfully."

class ReportResponse(ReportBase):
    id: str
    reporter_id: str
    tree_id: Optional[str] = None
    image_url: str
    status: str
    assigned_inspector_id: Optional[str] = None
    assigned_inspector_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    assigned_at: Optional[datetime] = None
    inspection_started_at: Optional[datetime] = None
    inspection_completed_at: Optional[datetime] = None
    service_started_at: Optional[datetime] = None
    service_completed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    work_performed: Optional[str] = None
    completion_notes: Optional[str] = None
    status_history: List[ReportStatusHistoryResponse] = []
    timeline: List[ReportTimelineStep] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReportAssignRequest(BaseModel):
    inspector_id: str = Field(..., description="ID of the field inspector to assign")
    notes: Optional[str] = Field(None, description="Operational notes or instructions for the inspector")
    priority: Optional[str] = Field(None, description="Override priority if needed")
    due_date: Optional[datetime] = Field(None, description="Target completion due date")

class ReportReviewRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Review verification notes")

class ReportStartInspectionRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Notes on starting inspection")

class ReportCompleteInspectionRequest(BaseModel):
    condition: Optional[str] = Field("Fair", description="Arborist observed tree condition")
    severity: Optional[str] = Field("Moderate", description="Observed hazard severity")
    notes: Optional[str] = Field(None, description="Inspection findings notes")
    recommended_action: Optional[str] = Field(None, description="Recommended maintenance/action schedule")
    service_required: bool = Field(False, description="Whether physical maintenance is required")

class ReportCompleteWorkRequest(BaseModel):
    work_performed: str = Field(..., min_length=2, description="Physical service performed")
    completion_notes: Optional[str] = Field(None, description="Completion and safety clearance notes")

class ReportCompleteRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Final resolution notes")
    work_performed: Optional[str] = Field(None, description="Optional override of work performed")

class InspectorOption(BaseModel):
    id: str
    full_name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)

class ReportListResponse(BaseModel):
    total: int
    reports: List[ReportResponse]
