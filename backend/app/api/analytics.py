from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get(
    "",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get municipal canopy health & risk analytics"
)
async def get_analytics(
    range: str = Query(default="90d", regex="^(7d|30d|90d|1y)$", description="Date range for analytics calculations"),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real aggregated analytics, KPI cards, health trends, category breakdowns,
    and geographic hotspots from PostgreSQL for the authenticated Organization Admin.
    """
    return await analytics_service.get_analytics_data(db, current_user, range_key=range)
