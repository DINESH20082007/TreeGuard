from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.models.user import User
from app.models.report import Report
from app.models.assignment import Assignment
from app.schemas.admin import (
    AdminDashboardResponse,
    MonitoringDashboardResponse,
    UserManagementItem,
    OrganizationSettingsResponse,
    OrganizationSettingsUpdate,
)
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Admin"])

# In-memory settings state with standard defaults for presentation and enterprise operations
_ORG_SETTINGS = {
    "organization_name": "Coimbatore Urban Forestry & Parks Division",
    "jurisdiction": "Coimbatore Municipal Corporation (Central & West Zones)",
    "emergency_sla_hours": 4.0,
    "auto_assignment_enabled": True,
    "triage_model": "TreeGuard Vision AI v2.4 (Active Triage)",
    "dispatch_email": "operations@treeguard.org",
    "primary_contact": "+91 422 230 4400 (Field Command)",
    "last_updated": datetime.now(timezone.utc).strftime("%b %d, %Y, %I:%M %p UTC"),
}

@router.get(
    "/dashboard",
    response_model=AdminDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Organization Admin Dashboard analytics and metrics"
)
async def get_admin_dashboard(
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real aggregated statistics, charts, response times, and active emergencies
    from PostgreSQL for the authenticated Organization Admin.
    Access is restricted strictly to the 'admin' role.
    """
    return await admin_service.get_dashboard_data(db, current_user)

@router.get(
    "/monitoring",
    response_model=MonitoringDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Tree Recovery & Continuous Monitoring dashboard data"
)
async def get_monitoring_dashboard(
    current_user: User = Depends(require_role(["admin", "inspector"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real aggregated monitoring metrics, recovery plan statuses, upcoming re-inspections,
    and attention trees for Organization Admins and Field Inspectors.
    """
    return await admin_service.get_monitoring_data(db)

@router.get(
    "/users",
    response_model=List[UserManagementItem],
    status_code=status.HTTP_200_OK,
    summary="Get all organization users with role activity"
)
async def get_organization_users(
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all registered users across Citizen, Inspector, and Admin roles with real assignment & report metrics.
    """
    users_stmt = select(User).order_by(User.created_at.desc())
    res = await db.execute(users_stmt)
    users = res.scalars().all()

    output = []
    for u in users:
        # Count assignments
        asn_stmt = select(func.count(Assignment.id)).where(Assignment.inspector_id == u.id)
        asn_res = await db.execute(asn_stmt)
        assigned_count = asn_res.scalar() or 0

        # Count reports
        rep_stmt = select(func.count(Report.id)).where(Report.reporter_id == u.id)
        rep_res = await db.execute(rep_stmt)
        reports_count = rep_res.scalar() or 0

        output.append(
            UserManagementItem(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                primary_district=u.primary_district or "RS Puram, Coimbatore",
                phone_number=u.phone_number,
                created_at=u.created_at,
                assigned_count=assigned_count,
                reports_count=reports_count,
            )
        )
    return output

@router.patch(
    "/users/{user_id}/status",
    response_model=UserManagementItem,
    status_code=status.HTTP_200_OK,
    summary="Update user active status or role"
)
async def update_user_status(
    user_id: str,
    payload: dict,
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggles user active state or updates role.
    """
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    target_user = res.scalars().first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if "is_active" in payload:
        target_user.is_active = bool(payload["is_active"])
    if "role" in payload and payload["role"] in ["citizen", "inspector", "admin"]:
        target_user.role = payload["role"]

    target_user.updated_at = datetime.now(timezone.utc)
    db.add(target_user)
    await db.commit()
    await db.refresh(target_user)

    asn_stmt = select(func.count(Assignment.id)).where(Assignment.inspector_id == target_user.id)
    asn_res = await db.execute(asn_stmt)
    assigned_count = asn_res.scalar() or 0

    rep_stmt = select(func.count(Report.id)).where(Report.reporter_id == target_user.id)
    rep_res = await db.execute(rep_stmt)
    reports_count = rep_res.scalar() or 0

    return UserManagementItem(
        id=target_user.id,
        full_name=target_user.full_name,
        email=target_user.email,
        role=target_user.role,
        is_active=target_user.is_active,
        primary_district=target_user.primary_district or "RS Puram, Coimbatore",
        phone_number=target_user.phone_number,
        created_at=target_user.created_at,
        assigned_count=assigned_count,
        reports_count=reports_count,
    )

@router.get(
    "/settings",
    response_model=OrganizationSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get organization operational settings"
)
async def get_organization_settings(
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Returns current organization operational settings, SLAs, and emergency response parameters.
    """
    return OrganizationSettingsResponse(**_ORG_SETTINGS)

@router.patch(
    "/settings",
    response_model=OrganizationSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Update organization operational settings"
)
async def update_organization_settings(
    payload: OrganizationSettingsUpdate,
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Updates organization operational settings, SLAs, and emergency dispatch rules.
    """
    if payload.organization_name is not None:
        _ORG_SETTINGS["organization_name"] = payload.organization_name
    if payload.jurisdiction is not None:
        _ORG_SETTINGS["jurisdiction"] = payload.jurisdiction
    if payload.emergency_sla_hours is not None:
        _ORG_SETTINGS["emergency_sla_hours"] = payload.emergency_sla_hours
    if payload.auto_assignment_enabled is not None:
        _ORG_SETTINGS["auto_assignment_enabled"] = payload.auto_assignment_enabled
    if payload.dispatch_email is not None:
        _ORG_SETTINGS["dispatch_email"] = payload.dispatch_email
    if payload.primary_contact is not None:
        _ORG_SETTINGS["primary_contact"] = payload.primary_contact

    _ORG_SETTINGS["last_updated"] = datetime.now(timezone.utc).strftime("%b %d, %Y, %I:%M %p UTC")
    return OrganizationSettingsResponse(**_ORG_SETTINGS)

