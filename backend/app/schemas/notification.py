from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    type: str = Field(..., description="emergency, update, assignment, resolved, alert, system")
    title: str
    message: str
    read: bool
    time: str = Field(..., description="Humanized relative timestamp string e.g. 2 min ago")
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    priority: Optional[str] = "normal"
    created_at: datetime

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int
    total_count: int

class UnreadCountResponse(BaseModel):
    unread_count: int

class MarkAllReadResponse(BaseModel):
    updated_count: int
    message: str
