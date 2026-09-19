from typing import List, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, require_role
from app.core.rate_limit import rate_limit_uploads
from app.models.user import User
from app.schemas.report import (
    ReportResponse,
    ReportCreateResponse,
    ReportReviewRequest,
    ReportAssignRequest,
    ReportStartInspectionRequest,
    ReportCompleteInspectionRequest,
    ReportCompleteWorkRequest,
    ReportCompleteRequest,
    InspectorOption,
)
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])

require_inspector_or_admin = require_role(["inspector", "admin"])

@router.post(
    "",
    response_model=ReportCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_uploads)],
    summary="Submit a new tree hazard/health report with photo upload"
)
async def create_report(
    image: UploadFile = File(..., description="Tree photo file (JPG, PNG, WEBP)"),
    issue_type: str = Form(..., description="Issue type (health, fallen, branch, trunk, storm, blocking, infrastructure, other)"),
    location_name: str = Form(..., description="Address, street, or landmark"),
    description: Optional[str] = Form(None, description="Detailed observation description"),
    latitude: Optional[float] = Form(None, description="Geolocation latitude"),
    longitude: Optional[float] = Form(None, description="Geolocation longitude"),
    observed_at: Optional[str] = Form(None, description="Observation timestamp string"),
    additional_notes: Optional[str] = Form(None, description="Optional extra notes"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a real tree report from an authenticated user.
    Validates uploaded photo, saves to storage, and persists report in database.
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

    report = await report_service.create_report(
        db=db,
        user=current_user,
        image_file=image,
        issue_type=issue_type,
        location_name=location_name,
        description=description,
        latitude=latitude,
        longitude=longitude,
        observed_at=observed_at,
        additional_notes=additional_notes,
    )

    return ReportCreateResponse(
        id=report.id,
        status=report.status,
        created_at=report.created_at,
        image_url=report.image_url,
        message="Tree report submitted successfully."
    )

@router.get(
    "/my",
    response_model=List[ReportResponse],
    summary="List reports submitted by current user"
)
async def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves all reports created by the currently authenticated user with real status and history.
    """
    reports = await report_service.get_user_reports(db, current_user.id)
    return reports

@router.get(
    "",
    response_model=List[ReportResponse],
    summary="List all reports (or user's reports based on role)"
)
async def get_reports_index(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    If admin or inspector, returns all organization reports; otherwise returns user's reports.
    """
    if current_user.role in ["admin", "inspector"]:
        return await report_service.get_all_reports(db)
    return await report_service.get_user_reports(db, current_user.id)

@router.get(
    "/inspectors/list",
    response_model=List[InspectorOption],
    summary="Get list of available inspectors for assignment"
)
async def list_inspectors_for_assignment(
    current_user: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns available staff members with 'inspector' or 'admin' role for report assignment dispatch.
    """
    stmt = select(User).where(User.role.in_(["inspector", "admin"])).order_by(User.full_name)
    res = await db.execute(stmt)
    users = res.scalars().all()
    return [InspectorOption(id=u.id, full_name=u.full_name, email=u.email, role=u.role) for u in users]

@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Get details of a specific report by ID"
)
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns single report record matching report_id with full real-time status timeline and status history.
    """
    report_resp = await report_service.get_report_response_by_id(db, report_id)
    if not report_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found."
        )
    
    # Check access permission: user must be the reporter or have elevated role
    if report_resp.reporter_id != current_user.id and current_user.role not in ["inspector", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this report."
        )

    return report_resp

@router.post(
    "/{report_id}/review",
    response_model=ReportResponse,
    summary="Review a report and transition to under-review"
)
async def review_report_endpoint(
    report_id: str,
    payload: Optional[ReportReviewRequest] = None,
    current_user: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Staff review action that transitions report status to 'under-review' and logs history.
    """
    notes = payload.notes if payload else None
    report = await report_service.review_report(db, report_id, current_user, notes)
    return await report_service.get_report_response_by_id(db, report.id)

@router.post(
    "/{report_id}/assign",
    response_model=ReportResponse,
    summary="Assign an inspector to a report and dispatch field work order"
)
async def assign_report_endpoint(
    report_id: str,
    payload: ReportAssignRequest,
    current_user: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Assigns a field inspector to the report, creating/linking a field assignment.
    """
    report = await report_service.assign_inspector(
        db=db,
        report_id=report_id,
        inspector_id=payload.inspector_id,
        assigned_by_user=current_user,
        notes=payload.notes,
        priority_override=payload.priority,
        due_date=payload.due_date,
    )
    return await report_service.get_report_response_by_id(db, report.id)

@router.post(
    "/{report_id}/start-inspection",
    response_model=ReportResponse,
    summary="Start field inspection for a report"
)
async def start_inspection_endpoint(
    report_id: str,
    payload: Optional[ReportStartInspectionRequest] = None,
    current_user: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Inspector starts field inspection, transitioning status to 'in-progress'.
    """
    notes = payload.notes if payload else None
    report = await report_service.start_inspection_for_report(db, report_id, current_user, notes)
    return await report_service.get_report_response_by_id(db, report.id)

@router.post(
    "/{report_id}/complete-inspection",
    response_model=ReportResponse,
    summary="Complete inspection and record arborist findings"
)
async def complete_inspection_endpoint(
    report_id: str,
    payload: ReportCompleteInspectionRequest,
    current_user: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Inspector records inspection findings. If service is needed, moves to 'service-required'.
    """
    report = await report_service.complete_inspection_for_report(
        db=db,
        report_id=report_id,
        user=current_user,
        condition=payload.condition or "Fair",
        severity=payload.severity or "Moderate",
        notes=payload.notes,
        recommended_action=payload.recommended_action,
        service_required=payload.service_required,
    )
    return await report_service.get_report_response_by_id(db, report.id)

@router.post(
    "/{report_id}/complete-work",
    response_model=ReportResponse,
    summary="Mark required physical maintenance / work completed"
)
async def complete_work_endpoint(
    report_id: str,
    payload: ReportCompleteWorkRequest,
    current_user: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Inspector records work performed and completion notes.
    """
    report = await report_service.complete_work_for_report(
        db=db,
        report_id=report_id,
        user=current_user,
        work_performed=payload.work_performed,
        completion_notes=payload.completion_notes,
    )
    return await report_service.get_report_response_by_id(db, report.id)

@router.post(
    "/{report_id}/complete",
    response_model=ReportResponse,
    summary="Complete and resolve the entire report"
)
async def complete_report_endpoint(
    report_id: str,
    payload: Optional[ReportCompleteRequest] = None,
    current_user: User = Depends(require_inspector_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Final operational action that officially completes and resolves the entire report.
    Validates authorizations and changes status to 'resolved'.
    """
    notes = payload.notes if payload else None
    work_performed = payload.work_performed if payload else None
    report = await report_service.complete_report(
        db=db,
        report_id=report_id,
        user=current_user,
        notes=notes,
        work_performed=work_performed,
    )
    return await report_service.get_report_response_by_id(db, report.id)
