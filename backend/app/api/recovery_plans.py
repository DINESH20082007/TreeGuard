from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User
from app.schemas.recovery_plan import (
    RecoveryPlanCreateRequest,
    RecoveryPlanUpdateRequest,
    RecoveryPlanResponse,
)
from app.services.recovery_plan_service import recovery_plan_service

router = APIRouter(tags=["Recovery Plans"])

# Enforce arborist/admin authorization for recovery plan authoring
require_plan_author = require_role(["inspector", "admin"])

@router.post(
    "/recovery-plans",
    response_model=RecoveryPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new recovery plan for a tree"
)
async def create_recovery_plan(
    data: RecoveryPlanCreateRequest,
    current_user: User = Depends(require_plan_author),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a real database-persisted recovery plan linked to the specified tree.
    Restricted to inspectors and administrators.
    """
    plan = await recovery_plan_service.create_plan(db, current_user, data)
    return plan

@router.get(
    "/recovery-plans/{plan_id}",
    response_model=RecoveryPlanResponse,
    summary="Get recovery plan details by plan ID"
)
async def get_recovery_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the complete recovery plan, actions, timeline, and tree context.
    """
    plan = await recovery_plan_service.get_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery plan with ID '{plan_id}' not found."
        )
    return plan

@router.put(
    "/recovery-plans/{plan_id}",
    response_model=RecoveryPlanResponse,
    summary="Update recovery plan actions, status, or details"
)
@router.patch(
    "/recovery-plans/{plan_id}",
    response_model=RecoveryPlanResponse,
    summary="Update recovery plan actions, status, or details"
)
async def update_recovery_plan(
    plan_id: str,
    data: RecoveryPlanUpdateRequest,
    current_user: User = Depends(require_plan_author),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates an existing recovery plan (e.g. marking actions completed, changing status).
    Restricted to inspectors and administrators.
    """
    plan = await recovery_plan_service.update_plan(db, current_user, plan_id, data)
    return plan

@router.get(
    "/trees/{tree_id}/recovery-plans",
    response_model=List[RecoveryPlanResponse],
    summary="List all recovery plans for a specific tree"
)
async def get_tree_recovery_plans(
    tree_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves all recovery plans associated with the specified tree ID.
    """
    plans = await recovery_plan_service.get_tree_plans(db, tree_id)
    return plans

@router.get(
    "/trees/{tree_id}/recovery-plan",
    response_model=RecoveryPlanResponse,
    summary="Get the active/latest recovery plan for a tree"
)
async def get_tree_latest_recovery_plan(
    tree_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the active recovery plan for the specified tree.
    """
    plan = await recovery_plan_service.get_tree_latest_plan(db, tree_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No recovery plan found for tree ID '{tree_id}'."
        )
    return plan
