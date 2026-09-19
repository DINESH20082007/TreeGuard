from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.models.user import User
from app.schemas.admin import AdminDashboardResponse, MonitoringDashboardResponse
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admin", tags=["Admin"])

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

