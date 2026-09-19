import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status

from app.models.tree import Tree
from app.schemas.tree import TreeCreateRequest, TreeRiskResponse, RiskFactor, RiskHistoryItem

# Curated seed data with real urban street coordinates
# Centered around Coimbatore, Tamil Nadu, India (approx. Lat 11.0168, Lng 76.9558)
INITIAL_TREES = [
    {
        "id": "TRE-0481",
        "species": "London Plane",
        "common_name": "London Planetree",
        "latitude": 11.0086,
        "longitude": 76.9489,
        "status": "at-risk",
        "health_score": 42,
        "health_confidence": 87,
        "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&auto=format",
        "location_name": "DB Road, RS Puram, Coimbatore",
        "last_inspection": "Sep 9, 2026",
        "height_m": 16.5,
        "canopy_spread_m": 12.0,
    },
    {
        "id": "TRE-0392",
        "species": "American Elm",
        "common_name": "American Elm",
        "latitude": 11.0286,
        "longitude": 76.9450,
        "status": "monitoring",
        "health_score": 68,
        "health_confidence": 84,
        "image_url": "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&h=600&fit=crop&auto=format",
        "location_name": "NSR Road, Saibaba Colony, Coimbatore",
        "last_inspection": "Aug 22, 2026",
        "height_m": 18.2,
        "canopy_spread_m": 14.5,
    },
    {
        "id": "TRE-0558",
        "species": "White Oak",
        "common_name": "White Oak",
        "latitude": 11.0020,
        "longitude": 76.9730,
        "status": "emergency",
        "health_score": 24,
        "health_confidence": 91,
        "image_url": "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&h=600&fit=crop&auto=format",
        "location_name": "Race Course Road Promenade, Coimbatore",
        "last_inspection": "Sep 14, 2026",
        "height_m": 22.0,
        "canopy_spread_m": 16.0,
    },
    {
        "id": "TRE-0612",
        "species": "Red Maple",
        "common_name": "Red Maple",
        "latitude": 11.0183,
        "longitude": 76.9667,
        "status": "healthy",
        "health_score": 92,
        "health_confidence": 96,
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&auto=format",
        "location_name": "Cross Cut Road, Gandhipuram, Coimbatore",
        "last_inspection": "Sep 1, 2026",
        "height_m": 14.0,
        "canopy_spread_m": 10.5,
    },
    {
        "id": "TRE-0403",
        "species": "Cherry Blossom",
        "common_name": "Yoshino Cherry",
        "latitude": 11.0270,
        "longitude": 77.0100,
        "status": "healthy",
        "health_score": 88,
        "health_confidence": 92,
        "image_url": "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&h=600&fit=crop&auto=format",
        "location_name": "Avinashi Road, Peelamedu, Coimbatore",
        "last_inspection": "Aug 29, 2026",
        "height_m": 9.5,
        "canopy_spread_m": 8.0,
    },
    {
        "id": "TRE-0519",
        "species": "Ginkgo Biloba",
        "common_name": "Maidenhair Tree",
        "latitude": 10.9980,
        "longitude": 77.0260,
        "status": "monitoring",
        "health_score": 71,
        "health_confidence": 89,
        "image_url": "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&h=600&fit=crop&auto=format",
        "location_name": "Trichy Road, Singanallur, Coimbatore",
        "last_inspection": "Sep 5, 2026",
        "height_m": 13.0,
        "canopy_spread_m": 7.5,
    },
    {
        "id": "TRE-0631",
        "species": "Silver Maple",
        "common_name": "Silver Maple",
        "latitude": 10.9900,
        "longitude": 76.9600,
        "status": "at-risk",
        "health_score": 49,
        "health_confidence": 81,
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&auto=format",
        "location_name": "Perur Main Road, Ukkadam, Coimbatore",
        "last_inspection": "Sep 11, 2026",
        "height_m": 17.0,
        "canopy_spread_m": 13.0,
    },
    {
        "id": "TRE-0488",
        "species": "Pin Oak",
        "common_name": "Pin Oak",
        "latitude": 11.0250,
        "longitude": 76.9050,
        "status": "healthy",
        "health_score": 95,
        "health_confidence": 94,
        "image_url": "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&h=600&fit=crop&auto=format",
        "location_name": "Marudhamalai Road, Vadavalli, Coimbatore",
        "last_inspection": "Sep 12, 2026",
        "height_m": 20.5,
        "canopy_spread_m": 15.0,
    },
    {
        "id": "TRE-0720",
        "species": "Japanese Maple",
        "common_name": "Japanese Maple",
        "latitude": 11.0800,
        "longitude": 76.9950,
        "status": "healthy",
        "health_score": 94,
        "health_confidence": 95,
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&auto=format",
        "location_name": "IT Park Road, Saravanampatti, Coimbatore",
        "last_inspection": "Sep 15, 2026",
        "height_m": 7.0,
        "canopy_spread_m": 6.5,
    },
    {
        "id": "TRE-0814",
        "species": "Coast Live Oak",
        "common_name": "California Live Oak",
        "latitude": 11.0700,
        "longitude": 77.0350,
        "status": "emergency",
        "health_score": 18,
        "health_confidence": 90,
        "image_url": "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&h=600&fit=crop&auto=format",
        "location_name": "SITRA Airport Road, Kalapatti, Coimbatore",
        "last_inspection": "Sep 17, 2026",
        "height_m": 19.0,
        "canopy_spread_m": 18.0,
    },
    {
        "id": "TRE-0902",
        "species": "Sweetgum",
        "common_name": "American Sweetgum",
        "latitude": 10.9550,
        "longitude": 76.9450,
        "status": "monitoring",
        "health_score": 64,
        "health_confidence": 86,
        "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&auto=format",
        "location_name": "Palakkad Road, Kuniyamuthur, Coimbatore",
        "last_inspection": "Sep 8, 2026",
        "height_m": 15.0,
        "canopy_spread_m": 9.0,
    },
    {
        "id": "TRE-0955",
        "species": "London Plane",
        "common_name": "London Planetree",
        "latitude": 11.0780,
        "longitude": 76.9350,
        "status": "healthy",
        "health_score": 91,
        "health_confidence": 93,
        "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop&auto=format",
        "location_name": "Mettupalayam Road, Thudiyalur, Coimbatore",
        "last_inspection": "Aug 30, 2026",
        "height_m": 16.0,
        "canopy_spread_m": 11.0,
    }
]

class TreeService:
    @staticmethod
    async def get_trees(
        db: AsyncSession,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 500,
    ) -> List[Tree]:
        query = select(Tree)

        if status_filter and status_filter.lower() != "all":
            query = query.where(Tree.status == status_filter.lower())

        if search and search.strip():
            search_pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Tree.id.ilike(search_pattern),
                    Tree.species.ilike(search_pattern),
                    Tree.common_name.ilike(search_pattern),
                    Tree.location_name.ilike(search_pattern),
                )
            )

        query = query.order_by(Tree.created_at.desc()).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_tree_by_id(db: AsyncSession, tree_id: str) -> Optional[Tree]:
        stmt = select(Tree).where(Tree.id == tree_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def create_tree(db: AsyncSession, data: TreeCreateRequest) -> Tree:
        tree_id = data.id if data.id else f"TRE-{str(uuid.uuid4().int)[:4].zfill(4)}"
        
        # Check duplicate ID
        existing = await db.execute(select(Tree).where(Tree.id == tree_id))
        if existing.scalars().first():
            tree_id = f"TRE-{str(uuid.uuid4().int)[:4].zfill(4)}"

        new_tree = Tree(
            id=tree_id,
            species=data.species.strip(),
            common_name=data.common_name.strip(),
            latitude=data.latitude,
            longitude=data.longitude,
            status=data.status,
            health_score=data.health_score,
            health_confidence=data.health_confidence or 85,
            image_url=data.image_url,
            location_name=data.location_name.strip(),
            last_inspection=data.last_inspection or "Recently registered",
            height_m=data.height_m,
            canopy_spread_m=data.canopy_spread_m,
        )

        db.add(new_tree)
        await db.commit()
        await db.refresh(new_tree)
        return new_tree

    @staticmethod
    async def get_tree_risk(db: AsyncSession, tree_id: str) -> Optional[TreeRiskResponse]:
        stmt = select(Tree).where(Tree.id == tree_id)
        result = await db.execute(stmt)
        tree = result.scalars().first()
        if not tree:
            return None

        status_val = (tree.status or "healthy").lower()
        score = tree.health_score if tree.health_score is not None else 75

        if status_val == "emergency" or score < 30:
            return TreeRiskResponse(
                tree_id=tree.id,
                future_risk="critical",
                prediction_horizon="Next 14 days",
                prediction_confidence=91,
                assessment="Immediate structural hazard & rapid deterioration",
                risk_factors=[
                    RiskFactor(factor="Current health score", value=f"{score} / 100"),
                    RiskFactor(factor="Structural integrity", value="High risk"),
                    RiskFactor(factor="Heat stress", value="Extreme"),
                    RiskFactor(factor="Recent rainfall", value="4 mm"),
                    RiskFactor(factor="Humidity", value="28%"),
                ],
                risk_explanation="Severely compromised health score combined with high environmental stress indicates critical failure risk without immediate intervention.",
                recommended_action="Emergency field inspection & structural stabilization recommended",
                risk_history=[
                    RiskHistoryItem(period="Aug 2026", risk="HIGH"),
                    RiskHistoryItem(period="Sep 2026", risk="CRITICAL"),
                ],
                trend="Critical decline",
                is_inconclusive=False,
            )
        elif status_val == "at-risk" or score < 55:
            return TreeRiskResponse(
                tree_id=tree.id,
                future_risk="high",
                prediction_horizon="Next 30 days",
                prediction_confidence=82,
                assessment="Potential deterioration",
                risk_factors=[
                    RiskFactor(factor="Current health score", value=f"{score} / 100"),
                    RiskFactor(factor="Heat stress", value="High"),
                    RiskFactor(factor="Recent rainfall", value="8 mm"),
                    RiskFactor(factor="Humidity", value="34%"),
                ],
                risk_explanation="Elevated heat stress combined with low rainfall over the last 14 days suggests potential canopy stress and accelerated deterioration if irrigation is not supplemented.",
                recommended_action="Manual inspection recommended",
                risk_history=[
                    RiskHistoryItem(period="Aug 2026", risk="MODERATE"),
                    RiskHistoryItem(period="Sep 2026", risk="HIGH"),
                ],
                trend="Deteriorating",
                is_inconclusive=False,
            )
        elif status_val == "monitoring" or score < 75:
            return TreeRiskResponse(
                tree_id=tree.id,
                future_risk="moderate",
                prediction_horizon="Next 45 days",
                prediction_confidence=78,
                assessment="Potential canopy thinning",
                risk_factors=[
                    RiskFactor(factor="Current health score", value=f"{score} / 100"),
                    RiskFactor(factor="Heat stress", value="Moderate"),
                    RiskFactor(factor="Recent rainfall", value="18 mm"),
                    RiskFactor(factor="Humidity", value="42%"),
                ],
                risk_explanation="Subtle crown thinning and moderate moisture deficit observed. Conditions warrant continued monitoring.",
                recommended_action="Routine follow-up observation recommended",
                risk_history=[
                    RiskHistoryItem(period="Aug 2026", risk="LOW"),
                    RiskHistoryItem(period="Sep 2026", risk="MODERATE"),
                ],
                trend="Stable / Minor stress",
                is_inconclusive=False,
            )
        else:
            return TreeRiskResponse(
                tree_id=tree.id,
                future_risk="low",
                prediction_horizon="Next 60 days",
                prediction_confidence=94,
                assessment="Low risk / stable health",
                risk_factors=[
                    RiskFactor(factor="Current health score", value=f"{score} / 100"),
                    RiskFactor(factor="Heat stress", value="Low"),
                    RiskFactor(factor="Recent rainfall", value="35 mm"),
                    RiskFactor(factor="Humidity", value="58%"),
                ],
                risk_explanation="Robust canopy density and vigorous shoot growth indicate good environmental resilience with low probability of near-term health deterioration.",
                recommended_action="Standard seasonal monitoring",
                risk_history=[
                    RiskHistoryItem(period="Aug 2026", risk="LOW"),
                    RiskHistoryItem(period="Sep 2026", risk="LOW"),
                ],
                trend="Stable",
                is_inconclusive=False,
            )

    @classmethod
    async def seed_initial_trees_if_empty(cls, db: AsyncSession) -> None:
        result = await db.execute(select(Tree))
        existing_trees = {t.id: t for t in result.scalars().all()}
        
        if not existing_trees:
            for item in INITIAL_TREES:
                tree = Tree(**item)
                db.add(tree)
            await db.commit()
        else:
            # Backfill and update initial seed trees to Coimbatore locations
            modified = False
            for item in INITIAL_TREES:
                tree_id = item["id"]
                if tree_id in existing_trees:
                    tree = existing_trees[tree_id]
                    if not tree.image_url and item.get("image_url"):
                        tree.image_url = item["image_url"]
                        modified = True
                    if tree.health_confidence is None and item.get("health_confidence") is not None:
                        tree.health_confidence = item["health_confidence"]
                        modified = True
                    # Update to Coimbatore location if still using legacy coordinates
                    if tree.latitude is None or tree.latitude > 20.0 or tree.latitude < 5.0 or "Downtown" in (tree.location_name or ""):
                        tree.latitude = item["latitude"]
                        tree.longitude = item["longitude"]
                        tree.location_name = item["location_name"]
                        modified = True
                else:
                    tree = Tree(**item)
                    db.add(tree)
                    modified = True
            if modified:
                await db.commit()

tree_service = TreeService()
