from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.tree import TreeResponse, TreeCreateRequest, TreeRiskResponse
from app.schemas.assignment import AssignmentResponse
from app.services.tree_service import tree_service

router = APIRouter(prefix="/trees", tags=["Trees"])

@router.get(
    "",
    response_model=List[TreeResponse],
    summary="Get all tree locations with optional status and search filtering"
)
async def get_trees(
    status: Optional[str] = Query(None, description="Filter by status (healthy, monitoring, at-risk, emergency, all)"),
    search: Optional[str] = Query(None, description="Search by species, ID, or location"),
    limit: int = Query(500, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns verified geographic tree locations with status indicators and health scores.
    """
    trees = await tree_service.get_trees(db, status_filter=status, search=search, limit=limit)
    return trees

@router.get(
    "/{tree_id}/risk",
    response_model=TreeRiskResponse,
    summary="Get AI Tree Risk Prediction for a specific tree"
)
async def get_tree_risk(
    tree_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns structured AI Tree Risk Prediction for the selected tree ID,
    including future risk level, prediction horizon, prediction confidence,
    risk factors, risk explanation, and preventive action recommendations.
    """
    risk = await tree_service.get_tree_risk(db, tree_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tree with ID '{tree_id}' not found."
        )
    return risk

@router.get(
    "/{tree_id}",
    response_model=TreeResponse,
    summary="Get specific tree details by ID"
)
async def get_tree_by_id(
    tree_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns single tree record by its unique ID (e.g. TRE-0481).
    """
    tree = await tree_service.get_tree_by_id(db, tree_id)
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tree with ID '{tree_id}' not found."
        )
    return tree

@router.get(
    "/{tree_id}/inspections",
    response_model=List[AssignmentResponse],
    summary="Get inspection and service history for a specific tree"
)
async def get_tree_inspections(
    tree_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns field inspection and service history for the tree from inspector assignments.
    """
    from app.models.assignment import Assignment
    stmt = (
        select(Assignment)
        .where(Assignment.tree_id == tree_id)
        .order_by(Assignment.assigned_at.desc())
    )
    result = await db.execute(stmt)
    assignments = result.scalars().all()
    return [AssignmentResponse.model_validate(a) for a in assignments]

@router.post(
    "",
    response_model=TreeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record/register a new tree with geographic coordinates"
)
async def create_tree(
    data: TreeCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registers a new tree with exact latitude and longitude coordinates.
    Requires authenticated session.
    """
    new_tree = await tree_service.create_tree(db, data)
    return new_tree


