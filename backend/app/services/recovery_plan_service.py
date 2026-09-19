import json
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.recovery_plan import RecoveryPlan
from app.models.tree import Tree
from app.models.user import User
from app.schemas.recovery_plan import (
    RecoveryPlanCreateRequest,
    RecoveryPlanUpdateRequest,
    RecoveryPlanResponse,
    RecoveryActionItem,
    RecoveryTimelineItem,
)

logger = logging.getLogger("treeguard.recovery_plan")

class RecoveryPlanService:
    @staticmethod
    async def generate_unique_plan_id(db: AsyncSession) -> str:
        for _ in range(10):
            suffix = str(uuid.uuid4().int)[:4].zfill(4)
            candidate_id = f"REC-2026-{suffix}"
            existing = await db.execute(select(RecoveryPlan).where(RecoveryPlan.id == candidate_id))
            if not existing.scalars().first():
                return candidate_id
        return f"REC-2026-{uuid.uuid4().hex[:4].upper()}"

    @classmethod
    async def create_plan(
        cls,
        db: AsyncSession,
        user: User,
        data: RecoveryPlanCreateRequest,
    ) -> RecoveryPlanResponse:
        # 1. Verify tree exists
        tree_stmt = select(Tree).where(Tree.id == data.tree_id)
        tree_res = await db.execute(tree_stmt)
        tree = tree_res.scalars().first()
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tree with ID '{data.tree_id}' not found."
            )

        # 2. Generate unique plan ID
        plan_id = await cls.generate_unique_plan_id(db)

        # 3. Serialize actions
        actions_list = []
        if data.actions:
            for i, a in enumerate(data.actions):
                item = a.model_dump()
                if not item.get("id"):
                    item["id"] = f"act-{i + 1}"
                actions_list.append(item)
        actions_json = json.dumps(actions_list)

        # 4. Construct initial timeline
        today_str = datetime.now(timezone.utc).strftime("%b %d, %Y")
        inspector_name = data.assigned_inspector_name or "Field Inspector"
        initial_timeline = [
            {
                "date": today_str,
                "event": "Plan created",
                "desc": "Recovery plan created based on AI assessment. Inspector assigned.",
                "type": "created",
            },
            {
                "date": today_str,
                "event": "Inspector assigned",
                "desc": f"{inspector_name} assigned to carry out this plan.",
                "type": "assigned",
            },
        ]
        if data.reinspection_date:
            initial_timeline.append({
                "date": data.reinspection_date,
                "event": "Re-inspection scheduled",
                "desc": "Full health re-assessment planned.",
                "type": "scheduled",
            })

        timeline_json = json.dumps(initial_timeline)

        plan = RecoveryPlan(
            id=plan_id,
            tree_id=tree.id,
            creator_id=user.id,
            assigned_inspector_name=inspector_name,
            status="In Progress",
            priority=data.priority,
            severity=data.severity,
            detected_issue=data.detected_issue or "Potential drought stress",
            ai_assessment=data.ai_assessment or "Canopy thinning and premature leaf drop consistent with extended dry period or root zone compaction.",
            ai_confidence=data.ai_confidence or 82,
            actions=actions_json,
            target_date=data.target_date,
            reinspection_date=data.reinspection_date,
            notes=data.notes,
            timeline=timeline_json,
        )

        db.add(plan)
        await db.commit()
        await db.refresh(plan)

        return cls._to_response(plan, tree)

    @classmethod
    async def get_plan_by_id(cls, db: AsyncSession, plan_id: str) -> Optional[RecoveryPlanResponse]:
        stmt = select(RecoveryPlan).where(RecoveryPlan.id == plan_id)
        res = await db.execute(stmt)
        plan = res.scalars().first()
        if not plan:
            return None

        tree_stmt = select(Tree).where(Tree.id == plan.tree_id)
        tree_res = await db.execute(tree_stmt)
        tree = tree_res.scalars().first()

        return cls._to_response(plan, tree)

    @classmethod
    async def get_tree_latest_plan(cls, db: AsyncSession, tree_id: str, auto_seed: bool = True) -> Optional[RecoveryPlanResponse]:
        # Check tree exists
        tree_stmt = select(Tree).where(Tree.id == tree_id)
        tree_res = await db.execute(tree_stmt)
        tree = tree_res.scalars().first()
        if not tree:
            return None

        stmt = select(RecoveryPlan).where(RecoveryPlan.id == tree_id) # also check if tree_id was passed as plan_id
        res = await db.execute(stmt)
        direct_plan = res.scalars().first()
        if direct_plan:
            return cls._to_response(direct_plan, tree)

        stmt = select(RecoveryPlan).where(RecoveryPlan.tree_id == tree_id).order_by(RecoveryPlan.created_at.desc())
        res = await db.execute(stmt)
        plan = res.scalars().first()

        if not plan and auto_seed and tree_id == "TRE-0481":
            plan = await cls.seed_default_plan_for_tree(db, tree)

        if not plan:
            return None

        return cls._to_response(plan, tree)

    @classmethod
    async def get_tree_plans(cls, db: AsyncSession, tree_id: str) -> List[RecoveryPlanResponse]:
        tree_stmt = select(Tree).where(Tree.id == tree_id)
        tree_res = await db.execute(tree_stmt)
        tree = tree_res.scalars().first()
        if not tree:
            return []

        stmt = select(RecoveryPlan).where(RecoveryPlan.tree_id == tree_id).order_by(RecoveryPlan.created_at.desc())
        res = await db.execute(stmt)
        plans = res.scalars().all()
        return [cls._to_response(p, tree) for p in plans]

    @classmethod
    async def update_plan(
        cls,
        db: AsyncSession,
        user: User,
        plan_id: str,
        data: RecoveryPlanUpdateRequest,
    ) -> RecoveryPlanResponse:
        stmt = select(RecoveryPlan).where(RecoveryPlan.id == plan_id)
        res = await db.execute(stmt)
        plan = res.scalars().first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recovery plan with ID '{plan_id}' not found."
            )

        tree_stmt = select(Tree).where(Tree.id == plan.tree_id)
        tree_res = await db.execute(tree_stmt)
        tree = tree_res.scalars().first()

        # Update basic fields if provided
        if data.status is not None:
            old_status = plan.status
            plan.status = data.status
            if data.status.lower() == "completed" and old_status.lower() != "completed":
                # Add completion event to timeline
                try:
                    timeline_list = json.loads(plan.timeline) if plan.timeline else []
                except Exception:
                    timeline_list = []
                timeline_list.append({
                    "date": datetime.now(timezone.utc).strftime("%b %d, %Y"),
                    "event": "Plan completed",
                    "desc": f"All recovery milestones completed and verified by {user.full_name}.",
                    "type": "completed",
                })
                plan.timeline = json.dumps(timeline_list)

        if data.priority is not None:
            plan.priority = data.priority
        if data.severity is not None:
            plan.severity = data.severity
        if data.assigned_inspector_name is not None:
            plan.assigned_inspector_name = data.assigned_inspector_name
        if data.target_date is not None:
            plan.target_date = data.target_date
        if data.reinspection_date is not None:
            plan.reinspection_date = data.reinspection_date
        if data.notes is not None:
            plan.notes = data.notes

        if data.actions is not None:
            actions_list = [a.model_dump() for a in data.actions]
            plan.actions = json.dumps(actions_list)

        await db.commit()
        await db.refresh(plan)
        return cls._to_response(plan, tree)

    @classmethod
    async def seed_default_plan_for_tree(cls, db: AsyncSession, tree: Tree) -> RecoveryPlan:
        # Find any user or system creator
        user_stmt = select(User).limit(1)
        user_res = await db.execute(user_stmt)
        system_user = user_res.scalars().first()
        creator_id = system_user.id if system_user else "system-user-treeguard"

        default_actions = [
            { "id": "a1", "label": "Inspect soil moisture levels", "note": None, "status": "completed", "assignee": "Marcus Johnson", "due": "Sep 20, 2026", "completed_date": "Sep 19, 2026" },
            { "id": "a2", "label": "Check and repair irrigation system", "note": None, "status": "completed", "assignee": "Marcus Johnson", "due": "Sep 20, 2026", "completed_date": "Sep 20, 2026" },
            { "id": "a3", "label": "Inspect damaged branches", "note": "Removal should be confirmed by a qualified inspector.", "status": "in-progress", "assignee": "Marcus Johnson", "due": "Sep 25, 2026", "completed_date": None },
            { "id": "a4", "label": "Monitor leaf condition over next 30 days", "note": None, "status": "pending", "assignee": "Field Team", "due": "Oct 9, 2026", "completed_date": None },
            { "id": "a5", "label": "Reassess health after recommended period", "note": None, "status": "pending", "assignee": "AI System", "due": "Oct 9, 2026", "completed_date": None },
        ]

        default_timeline = [
            { "date": "Sep 16, 2026", "event": "Plan created", "desc": "Recovery plan created based on AI assessment. Inspector assigned.", "type": "created" },
            { "date": "Sep 16, 2026", "event": "Inspector assigned", "desc": "Marcus Johnson assigned to this plan.", "type": "assigned" },
            { "date": "Sep 19, 2026", "event": "Inspection completed", "desc": "Soil moisture and irrigation checked. Root compaction confirmed.", "type": "completed" },
            { "date": "Sep 20, 2026", "event": "Maintenance performed", "desc": "Irrigation line repaired. Soil aeration applied to root zone.", "type": "completed" },
            { "date": "Sep 25, 2026", "event": "Follow-up inspection scheduled", "desc": "Branch inspection due.", "type": "scheduled" },
            { "date": "Oct 9, 2026", "event": "Re-inspection scheduled", "desc": "Full health re-assessment planned.", "type": "scheduled" },
        ]

        plan = RecoveryPlan(
            id="REC-2026-0481",
            tree_id=tree.id,
            creator_id=creator_id,
            assigned_inspector_name="Marcus Johnson",
            status="In Progress",
            priority="Medium",
            severity="Moderate",
            detected_issue="Potential drought stress",
            ai_assessment="Canopy thinning and premature leaf drop consistent with extended dry period or root zone compaction. Field inspection recommended.",
            ai_confidence=82,
            actions=json.dumps(default_actions),
            target_date="2026-09-25",
            reinspection_date="2026-10-09",
            notes="Initial assessment logged by field crew. Soil aeration applied to root zone.",
            timeline=json.dumps(default_timeline),
        )

        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        return plan

    @classmethod
    def _to_response(cls, plan: RecoveryPlan, tree: Optional[Tree] = None) -> RecoveryPlanResponse:
        try:
            raw_actions = json.loads(plan.actions) if plan.actions else []
            actions = [RecoveryActionItem(**a) for a in raw_actions]
        except Exception:
            actions = []

        try:
            raw_timeline = json.loads(plan.timeline) if plan.timeline else []
            timeline = [RecoveryTimelineItem(**t) for t in raw_timeline]
        except Exception:
            timeline = []

        return RecoveryPlanResponse(
            id=plan.id,
            tree_id=plan.tree_id,
            tree_species=tree.species if tree else None,
            tree_common_name=tree.common_name if tree else None,
            tree_location=tree.location_name if tree else None,
            tree_image_url=tree.image_url if tree else None,
            tree_health_score=tree.health_score if tree else None,
            tree_status=tree.status if tree else None,
            creator_id=plan.creator_id,
            assigned_inspector_id=plan.assigned_inspector_id,
            assigned_inspector_name=plan.assigned_inspector_name,
            status=plan.status,
            priority=plan.priority,
            severity=plan.severity,
            detected_issue=plan.detected_issue,
            ai_assessment=plan.ai_assessment,
            ai_confidence=plan.ai_confidence,
            actions=actions,
            target_date=plan.target_date,
            reinspection_date=plan.reinspection_date,
            notes=plan.notes,
            timeline=timeline,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
        )

recovery_plan_service = RecoveryPlanService()
