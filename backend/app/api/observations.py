from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User
from app.schemas.observation import (
    ObservationCreateRequest,
    ObservationComparisonResponse,
    ObservationResponse,
)
from app.services.observation_service import observation_service

router = APIRouter(tags=["Continuous Monitoring & Observations"])

@router.post(
    "/observations",
    response_model=ObservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new follow-up tree observation"
)
async def create_observation(
    data: ObservationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a real database-backed follow-up observation for a tree.
    Updates the tree's health metrics, recovery plan status, and assignment if linked.
    """
    obs = await observation_service.create_observation(db, current_user, data)
    return obs

@router.get(
    "/observations/{observation_id}",
    response_model=ObservationResponse,
    summary="Get observation details by ID"
)
async def get_observation_by_id(
    observation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the complete observation record including tree species and location.
    """
    obs = await observation_service.get_observation_by_id(db, observation_id)
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID '{observation_id}' not found."
        )
    return obs

@router.get(
    "/trees/{tree_id}/observations",
    response_model=List[ObservationResponse],
    summary="Get all historical observations for a tree"
)
async def get_tree_observations(
    tree_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the complete chronological observation timeline for the selected tree.
    """
    observations = await observation_service.get_tree_observations(db, tree_id)
    return observations

@router.get(
    "/trees/{tree_id}/comparison",
    response_model=ObservationComparisonResponse,
    summary="Get AI observation comparison for a tree"
)
async def get_tree_observation_comparison(
    tree_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Compares the two latest observations or latest observation against baseline
    and returns score changes, visual indicators, and next action recommendations.
    """
    comparison = await observation_service.compare_observations(db, tree_id)
    return comparison

@router.get(
    "/recovery-plans/{plan_id}/observations",
    response_model=List[ObservationResponse],
    summary="Get observations linked to a specific recovery plan"
)
async def get_recovery_plan_observations(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves all monitoring observations recorded under the specified recovery plan.
    """
    observations = await observation_service.get_plan_observations(db, plan_id)
    return observations
