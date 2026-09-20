from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AdminTopCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    value: str
    delta: str
    icon: str
    color: str

class HealthDistributionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    value: int
    color: str

class EmergencyOverTimeItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    month: str
    count: int

class HealthTrendItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    month: str
    healthy: int
    atRisk: int

class ResponseTimeItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    hours: float

class ActiveEmergencyItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    issue: str
    location: str
    severity: str
    inspector: str
    status: str
    created_at: Optional[datetime] = None

class RecentReportItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    location_name: str
    issue_type: str
    priority: str
    status: str
    created_at: datetime

class RecentInspectionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    tree_id: Optional[str] = None
    location_name: str
    priority: str
    inspection_status: str
    service_status: str
    completed_at: Optional[datetime] = None

class TreesBreakdown(BaseModel):
    total: int = 0
    healthy: int = 0
    monitoring: int = 0
    at_risk: int = 0
    emergency: int = 0

class ReportsBreakdown(BaseModel):
    total: int = 0
    pending: int = 0
    under_review: int = 0
    resolved: int = 0

class EmergenciesBreakdown(BaseModel):
    total: int = 0
    open: int = 0
    resolved: int = 0

class InspectionsBreakdown(BaseModel):
    total: int = 0
    completed: int = 0
    pending: int = 0
    follow_up_required: int = 0

class ServicesBreakdown(BaseModel):
    required: int = 0
    in_progress: int = 0
    completed: int = 0

class MonitoringBreakdown(BaseModel):
    active_plans: int = 0
    total_plans: int = 0
    total_observations: int = 0

class AdminSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_trees: int
    healthy_trees: int
    at_risk_trees: int
    emergency_trees: int
    total_reports: int
    pending_reports: int
    active_emergencies: int
    completed_inspections: int
    total_observations: int
    total_recovery_plans: int

class AdminDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_name: str
    current_date: str
    top_cards: List[AdminTopCard]
    health_distribution: List[HealthDistributionItem]
    emergency_over_time: List[EmergencyOverTimeItem]
    health_trend: List[HealthTrendItem]
    response_time: List[ResponseTimeItem]
    active_emergencies: List[ActiveEmergencyItem]
    summary: AdminSummary
    trees_breakdown: Optional[TreesBreakdown] = None
    reports_breakdown: Optional[ReportsBreakdown] = None
    emergencies_breakdown: Optional[EmergenciesBreakdown] = None
    inspections_breakdown: Optional[InspectionsBreakdown] = None
    services_breakdown: Optional[ServicesBreakdown] = None
    monitoring_breakdown: Optional[MonitoringBreakdown] = None
    recent_reports: Optional[List[RecentReportItem]] = None
    recent_inspections: Optional[List[RecentInspectionItem]] = None

class MonitoringHealthTrendItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: str
    improving: int
    stable: int
    deteriorating: int

class MonitoringPlanStatusItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    count: int

class UpcomingReinspectionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    treeId: str
    species: str
    location: str
    date: str
    inspector: str
    status: str
    daysLeft: int

class AttentionTreeItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    species: str
    change: int
    priority: str
    issue: str

class MonitoringDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_name: str
    current_date: str
    summary_cards: List[AdminTopCard]
    health_trend: List[MonitoringHealthTrendItem]
    plan_status: List[MonitoringPlanStatusItem]
    upcoming_reinspections: List[UpcomingReinspectionItem]
    attention_trees: List[AttentionTreeItem]

class UserManagementItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    role: str
    is_active: bool
    primary_district: Optional[str] = "RS Puram, Coimbatore"
    phone_number: Optional[str] = None
    created_at: datetime
    assigned_count: int = 0
    reports_count: int = 0

class OrganizationSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    organization_name: str
    jurisdiction: str
    emergency_sla_hours: float
    auto_assignment_enabled: bool
    triage_model: str
    dispatch_email: str
    primary_contact: str
    last_updated: Optional[str] = None

class OrganizationSettingsUpdate(BaseModel):
    organization_name: Optional[str] = None
    jurisdiction: Optional[str] = None
    emergency_sla_hours: Optional[float] = None
    auto_assignment_enabled: Optional[bool] = None
    dispatch_email: Optional[str] = None
    primary_contact: Optional[str] = None

