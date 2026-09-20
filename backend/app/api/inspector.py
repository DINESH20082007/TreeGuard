from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.models.user import User
from app.schemas.assignment import (
    AssignmentResponse,
    InspectorStatsResponse,
    InspectionCompleteRequest,
    AssignmentWorkflowUpdateRequest,
)
from app.services.inspector_service import inspector_service

router = APIRouter(prefix="/inspector", tags=["Inspector Operations"])

# Security dependency ensuring only users with 'inspector' or 'admin' role can access
require_inspector_role = require_role(["inspector", "admin"])

@router.get(
    "/assignments",
    response_model=List[AssignmentResponse],
    summary="Get assignments for the authenticated field inspector"
)
async def get_my_assignments(
    current_user: User = Depends(require_inspector_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves all field assignments belonging to the currently authenticated inspector.
    Citizens receive 403 Forbidden.
    """
    # Seed initial assignments for the inspector if empty
    await inspector_service.seed_initial_inspector_assignments_if_empty(db, current_user.id)
    assignments = await inspector_service.get_inspector_assignments(db, current_user.id)
    return assignments

@router.get(
    "/stats",
    response_model=InspectorStatsResponse,
    summary="Get calculated dashboard statistics for the authenticated inspector"
)
async def get_my_stats(
    current_user: User = Depends(require_inspector_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculates live dashboard counts (Assigned Today, High Priority, Pending Inspection, Completed, Emergency Cases).
    """
    await inspector_service.seed_initial_inspector_assignments_if_empty(db, current_user.id)
    stats = await inspector_service.get_inspector_stats(db, current_user.id)
    return stats

@router.get(
    "/assignments/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Get details of a specific assignment by ID"
)
async def get_assignment_detail(
    assignment_id: str,
    current_user: User = Depends(require_inspector_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves a single assignment matching assignment_id, enforcing ownership access control.
    """
    assignment = await inspector_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID '{assignment_id}' not found."
        )

    # Permission check: must belong to the inspector or user must be admin or client presentation account
    is_client = bool(getattr(current_user, "is_client_presentation", False) or current_user.email == "client@treeguard.org")
    if assignment.inspector_id != current_user.id and current_user.role != "admin" and not is_client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this assignment."
        )

    return AssignmentResponse.model_validate(assignment)

@router.patch(
    "/assignments/{assignment_id}/workflow",
    response_model=AssignmentResponse,
    summary="Update inspection and service workflow lifecycle"
)
async def update_assignment_workflow(
    assignment_id: str,
    payload: AssignmentWorkflowUpdateRequest,
    current_user: User = Depends(require_inspector_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the inspection and service lifecycle status of an assignment.
    Enforces authorization and business logic transitions.
    """
    assignment = await inspector_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID '{assignment_id}' not found."
        )

    is_client = bool(getattr(current_user, "is_client_presentation", False) or current_user.email == "client@treeguard.org")
    if assignment.inspector_id != current_user.id and current_user.role != "admin" and not is_client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this assignment."
        )

    try:
        updated = await inspector_service.update_assignment_workflow(
            db=db,
            assignment_id=assignment_id,
            inspector_id=current_user.id,
            action=payload.action,
            inspection_status=payload.inspection_status,
            service_required=payload.service_required,
            service_status=payload.service_status,
            condition=payload.condition,
            severity=payload.severity,
            notes=payload.notes,
            recommended_action=payload.recommended_action,
            service_performed=payload.service_performed,
            service_notes=payload.service_notes,
            work_performed=payload.work_performed,
            completion_notes=payload.completion_notes,
        )
        return AssignmentResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post(
    "/assignments/{assignment_id}/complete",
    response_model=AssignmentResponse,
    summary="Complete an assignment and submit arborist inspection findings"
)
async def complete_assignment(
    assignment_id: str,
    payload: InspectionCompleteRequest,
    current_user: User = Depends(require_inspector_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Completes an assignment, records field findings & notes, and updates linked report and tree statuses.
    """
    assignment = await inspector_service.get_assignment_by_id(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID '{assignment_id}' not found."
        )

    is_client = bool(getattr(current_user, "is_client_presentation", False) or current_user.email == "client@treeguard.org")
    if assignment.inspector_id != current_user.id and current_user.role != "admin" and not is_client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to complete this assignment."
        )

    try:
        updated = await inspector_service.complete_assignment(
            db=db,
            assignment_id=assignment_id,
            inspector_id=current_user.id,
            condition=payload.condition,
            severity=payload.severity,
            notes=payload.notes,
            recommended_action=payload.recommended_action,
            service_required=payload.service_required,
            service_status=payload.service_status,
            service_performed=payload.service_performed,
            service_notes=payload.service_notes,
        )
        return AssignmentResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

