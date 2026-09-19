from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.trees import router as trees_router
from app.api.reports import router as reports_router
from app.api.emergency import router as emergency_router
from app.api.inspector import router as inspector_router
from app.api.recovery_plans import router as recovery_plans_router
from app.api.observations import router as observations_router
from app.api.notifications import router as notifications_router
from app.api.admin import router as admin_router
from app.api.analytics import router as analytics_router

__all__ = [
    "auth_router",
    "users_router",
    "trees_router",
    "reports_router",
    "emergency_router",
    "inspector_router",
    "recovery_plans_router",
    "observations_router",
    "notifications_router",
    "admin_router",
    "analytics_router",
]



