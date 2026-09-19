from typing import List, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.rate_limit import rate_limit_uploads
from app.models.user import User
from app.schemas.emergency import EmergencyAnalysisResponse
from app.services.emergency_service import emergency_service

router = APIRouter(prefix="/emergency", tags=["Emergency Detection"])

@router.post(
    "/analyze",
    response_model=EmergencyAnalysisResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_uploads)],
    summary="Analyze tree emergency situation from photo upload"
)
async def analyze_emergency(
    image: UploadFile = File(..., description="Emergency photo file (JPG, PNG, WEBP)"),
    report_id: Optional[str] = Form(None, description="Optional associated report ID"),
    tree_id: Optional[str] = Form(None, description="Optional associated tree ID"),
    location_name: Optional[str] = Form(None, description="Optional address or landmark"),
    latitude: Optional[float] = Form(None, description="Optional GPS latitude"),
    longitude: Optional[float] = Form(None, description="Optional GPS longitude"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits an emergency photo for real backend analysis.
    Validates the uploaded image, checks model availability, saves record to DB,
    and returns structured assessment data.
    """
    if latitude is not None and not (-90.0 <= latitude <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Latitude must be between -90.0 and 90.0."
        )
    if longitude is not None and not (-180.0 <= longitude <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Longitude must be between -180.0 and 180.0."
        )

    analysis = await emergency_service.analyze_and_create(
        db=db,
        user=current_user,
        image_file=image,
        report_id=report_id,
        tree_id=tree_id,
        location_name=location_name,
        latitude=latitude,
        longitude=longitude,
    )
    return analysis

@router.get(
    "/my",
    response_model=List[EmergencyAnalysisResponse],
    summary="List emergency analyses performed by current user"
)
async def get_my_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves all emergency analyses initiated by the authenticated user.
    """
    analyses = await emergency_service.get_user_analyses(db, current_user.id)
    return analyses

@router.get(
    "/{analysis_id}",
    response_model=EmergencyAnalysisResponse,
    summary="Get details of a specific emergency analysis by ID"
)
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves a single emergency analysis matching analysis_id.
    """
    analysis = await emergency_service.get_analysis_by_id(db, analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency analysis with ID '{analysis_id}' not found."
        )

    # Permission check: owner or elevated role
    if analysis.user_id != current_user.id and current_user.role not in ["inspector", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this emergency analysis."
        )

    return emergency_service._to_response(analysis)
