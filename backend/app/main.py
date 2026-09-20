import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, async_session_maker
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
from app.models.user import User
from app.services.tree_service import tree_service
from app.services.auth_service import auth_service
from app.services.inspector_service import inspector_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("treeguard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting TreeGuard Backend...")
    # Ensure uploads directories exist
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "emergency"), exist_ok=True)

    # Initialize database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Schema migration helper for database tables
        def check_and_migrate_tables(connection):
            try:
                cursor = connection.connection.cursor()
                # Migrate users columns
                cursor.execute("PRAGMA table_info(users)")
                user_cols = {row[1] for row in cursor.fetchall()}
                new_user_cols = [
                    ("phone_number", "VARCHAR(50)"),
                    ("primary_district", "VARCHAR(100) DEFAULT 'RS Puram, Coimbatore'"),
                    ("avatar_url", "VARCHAR(500)"),
                    ("notification_preferences", "TEXT"),
                    ("privacy_settings", "TEXT"),
                    ("is_client_presentation", "BOOLEAN DEFAULT 0"),
                ]
                for col_name, col_def in new_user_cols:
                    if col_name not in user_cols:
                        cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                        logger.info(f"Added column {col_name} to users table.")

                # Migrate reports columns
                cursor.execute("PRAGMA table_info(reports)")
                report_cols = {row[1] for row in cursor.fetchall()}
                new_report_cols = [
                    ("tree_id", "VARCHAR(36)"),
                    ("assigned_inspector_id", "VARCHAR(36)"),
                    ("assigned_inspector_name", "VARCHAR(255)"),
                    ("reviewed_at", "DATETIME"),
                    ("assigned_at", "DATETIME"),
                    ("inspection_started_at", "DATETIME"),
                    ("inspection_completed_at", "DATETIME"),
                    ("service_started_at", "DATETIME"),
                    ("service_completed_at", "DATETIME"),
                    ("resolved_at", "DATETIME"),
                    ("work_performed", "TEXT"),
                    ("completion_notes", "TEXT"),
                ]
                for col_name, col_def in new_report_cols:
                    if col_name not in report_cols:
                        cursor.execute(f"ALTER TABLE reports ADD COLUMN {col_name} {col_def}")
                        logger.info(f"Added column {col_name} to reports table.")

                # Migrate inspector_assignments columns
                cursor.execute("PRAGMA table_info(inspector_assignments)")
                asn_cols = {row[1] for row in cursor.fetchall()}
                new_asn_cols = [
                    ("inspection_status", "VARCHAR(50) DEFAULT 'Assigned'"),
                    ("service_required", "BOOLEAN DEFAULT 0"),
                    ("service_status", "VARCHAR(50) DEFAULT 'Not Required'"),
                    ("service_performed", "VARCHAR(255)"),
                    ("service_notes", "TEXT"),
                    ("service_completed_at", "DATETIME"),
                    ("inspection_started_at", "DATETIME"),
                    ("inspection_completed_at", "DATETIME"),
                ]
                for col_name, col_def in new_asn_cols:
                    if col_name not in asn_cols:
                        cursor.execute(f"ALTER TABLE inspector_assignments ADD COLUMN {col_name} {col_def}")
                        logger.info(f"Added column {col_name} to inspector_assignments table.")
            except Exception as e:
                logger.warning(f"Table migration notice: {e}")

        await conn.run_sync(check_and_migrate_tables)
    logger.info("Database tables initialized successfully.")

    # Seed initial trees if empty
    async with async_session_maker() as session:
        await tree_service.seed_initial_trees_if_empty(session)
        
        # Seed or verify dedicated client presentation account
        client_user = await auth_service.get_user_by_email(session, "client@treeguard.org")
        if not client_user:
            client_user = User(
                full_name="TreeGuard Client",
                email="client@treeguard.org",
                password_hash=auth_service.hash_password("SecurePassword123!"),
                role="admin",
                is_client_presentation=True,
                primary_district="RS Puram, Coimbatore",
                is_active=True
            )
            session.add(client_user)
            await session.commit()
            await session.refresh(client_user)
            logger.info("Created dedicated client presentation account: client@treeguard.org")
        else:
            if not getattr(client_user, "is_client_presentation", False):
                client_user.is_client_presentation = True
                session.add(client_user)
                await session.commit()

        # Seed inspector assignments for client account so field operations work immediately
        await inspector_service.seed_initial_inspector_assignments_if_empty(session, client_user.id)

        # Ensure standard role test accounts exist
        for email, name, role in [
            ("citizen@treeguard.org", "Citizen Ramesh", "citizen"),
            ("inspector@treeguard.org", "Field Inspector Kumar", "inspector"),
            ("admin@treeguard.org", "Admin Officer", "admin"),
        ]:
            u = await auth_service.get_user_by_email(session, email)
            if not u:
                u = User(
                    full_name=name,
                    email=email,
                    password_hash=auth_service.hash_password("SecurePassword123!"),
                    role=role,
                    is_client_presentation=False,
                    primary_district="RS Puram, Coimbatore",
                    is_active=True
                )
                session.add(u)
                await session.commit()
                await session.refresh(u)
                logger.info(f"Seeded standard {role} user: {email}")
            if role == "inspector":
                await inspector_service.seed_initial_inspector_assignments_if_empty(session, u.id)

    logger.info("Urban forestry trees and presentation accounts verified and loaded.")

    yield
    logger.info("Shutting down TreeGuard Backend...")
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"
    return response

# CORS Configuration (Restricted methods and headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Mount static uploads directory for direct image viewing
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Exception handlers for clean user-facing error messages
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    field = first_error.get("loc", ["field"])[-1]
    msg = first_error.get("msg", "Invalid input")
    clean_msg = f"{str(field).replace('_', ' ').capitalize()}: {msg}"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": clean_msg}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log full error with stack trace securely on the server
    logger.error(f"Unhandled server error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    # Return controlled response to client without exposing internal stack traces
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(trees_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(emergency_router, prefix=settings.API_V1_STR)
app.include_router(inspector_router, prefix=settings.API_V1_STR)
app.include_router(recovery_plans_router, prefix=settings.API_V1_STR)
app.include_router(observations_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "TreeGuard Backend", "version": settings.VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
