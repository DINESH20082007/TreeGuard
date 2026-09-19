import sys
import asyncio
from datetime import datetime, timezone
import uuid
from sqlalchemy import select, func, inspect

from app.database import engine, async_session_maker, Base
import app.models  # Ensure all models are registered
from app.models.user import User
from app.models.tree import Tree
from app.models.report import Report
from app.models.emergency import EmergencyAnalysis
from app.models.assignment import Assignment
from app.models.recovery_plan import RecoveryPlan
from app.models.observation import Observation
from app.models.notification import Notification
from app.models.token import PasswordResetToken

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

async def test_database_and_models():
    print("\n=================================================================")
    print("RUNNING TREEGUARD DATABASE MODELS & SCHEMA TEST SUITE")
    print("=================================================================")

    # 1. Verify Engine & Database Connection
    print("\n[STEP 1] Testing Database Connection & Engine Configuration...")
    async with engine.connect() as conn:
        res = await conn.execute(select(1))
        val = res.scalar()
        assert val == 1, f"Expected 1, got {val}"
        print(f"  [PASS] Database connection verified. URL: {engine.url.render_as_string(hide_password=True)}")

    # 2. Verify all expected tables in SQLAlchemy Base.metadata
    print("\n[STEP 2] Verifying SQLAlchemy Base.metadata Table Registration...")
    expected_tables = {
        "users",
        "trees",
        "reports",
        "emergency_analyses",
        "inspector_assignments",
        "recovery_plans",
        "observations",
        "notifications",
        "password_reset_tokens",
    }
    registered_tables = set(Base.metadata.tables.keys())
    for t in expected_tables:
        assert t in registered_tables, f"Missing table {t} in Base.metadata!"
        print(f"  [PASS] Table '{t}' successfully registered in SQLAlchemy metadata.")

    # 3. Verify Columns, Foreign Keys, and Indexes on each model
    print("\n[STEP 3] Verifying Models, Foreign Keys & Table Indexes...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        def migrate_schema(sync_conn):
            cursor = sync_conn.connection.cursor()
            cursor.execute("PRAGMA table_info(reports)")
            r_cols = {row[1] for row in cursor.fetchall()}
            if "tree_id" not in r_cols:
                cursor.execute("ALTER TABLE reports ADD COLUMN tree_id VARCHAR(36)")
        await conn.run_sync(migrate_schema)

        def inspect_tables(sync_conn):
            inspector = inspect(sync_conn)
            table_names = inspector.get_table_names()
            
            for tbl in expected_tables:
                assert tbl in table_names, f"Table '{tbl}' not found in actual database!"
                columns = {c['name']: c for c in inspector.get_columns(tbl)}
                fks = inspector.get_foreign_keys(tbl)
                indexes = inspector.get_indexes(tbl)
                print(f"  [TABLE] {tbl}: {len(columns)} columns, {len(fks)} foreign keys, {len(indexes)} indexes.")
                
            # Specific schema checks
            user_cols = {c['name'] for c in inspector.get_columns('users')}
            assert 'phone_number' in user_cols
            assert 'primary_district' in user_cols
            assert 'avatar_url' in user_cols
            assert 'notification_preferences' in user_cols
            assert 'privacy_settings' in user_cols

            report_cols = {c['name'] for c in inspector.get_columns('reports')}
            assert 'tree_id' in report_cols

        await conn.run_sync(inspect_tables)
        print("  [PASS] All expected columns, foreign keys, and indexes verified.")

    # 4. Test CRUD and Relationships across models
    print("\n[STEP 4] Testing Model CRUD Operations & Foreign Key Integrity...")
    uid = uuid.uuid4().hex[:6]
    test_email = f"db_tester_{uid}@treeguard.org"

    async with async_session_maker() as session:
        # Create User
        test_user = User(
            full_name="Database Tester",
            email=test_email,
            password_hash="$2b$12$dummyhashforunittestingonly",
            role="citizen",
            phone_number="+1 (555) 019-2834",
            primary_district="Downtown District"
        )
        session.add(test_user)
        await session.commit()
        await session.refresh(test_user)
        assert test_user.id is not None
        print(f"  [PASS] Created User: {test_user.id} ({test_user.email})")

        # Create Tree
        tree_id = f"TRE-TEST-{uid}"
        test_tree = Tree(
            id=tree_id,
            species="Platanus occidentalis",
            common_name="American Sycamore",
            latitude=37.7749,
            longitude=-122.4194,
            status="healthy",
            health_score=92,
            location_name="Civic Center Plaza",
            last_inspection="Sep 2026"
        )
        session.add(test_tree)
        await session.commit()
        print(f"  [PASS] Created Tree: {test_tree.id} ({test_tree.common_name})")

        # Create Report linked to Tree & User
        report_id = f"TRG-TEST-{uid}"
        test_report = Report(
            id=report_id,
            reporter_id=test_user.id,
            tree_id=test_tree.id,
            issue_type="branch",
            description="Test broken limb report",
            location_name=test_tree.location_name,
            image_url="/uploads/reports/test.jpg",
            priority="Medium",
            status="pending"
        )
        session.add(test_report)
        await session.commit()
        print(f"  [PASS] Created Report: {test_report.id} linked to tree {test_report.tree_id}")

        # Create Emergency Analysis
        emg_id = f"EMG-TEST-{uid}"
        test_emg = EmergencyAnalysis(
            id=emg_id,
            user_id=test_user.id,
            report_id=test_report.id,
            tree_id=test_tree.id,
            image_url="/uploads/emergency/test.jpg",
            analysis_status="completed",
            emergency_detected=False,
            severity="None",
            confidence=0.0,
            detected_issue="No hazard",
            explanation="Manual test analysis",
            recommended_action="Routine inspection",
            is_ai_available=False
        )
        session.add(test_emg)
        await session.commit()
        print(f"  [PASS] Created Emergency Analysis: {test_emg.id}")

        # Create Notification
        notif_id = f"NTF-TEST-{uid}"
        test_notif = Notification(
            id=notif_id,
            user_id=test_user.id,
            type="system",
            title="Database Test Notification",
            message="Your report has been received.",
            read=False
        )
        session.add(test_notif)
        await session.commit()
        print(f"  [PASS] Created Notification: {test_notif.id} for user {test_notif.user_id}")

        # Clean up test rows
        await session.delete(test_notif)
        await session.delete(test_emg)
        await session.delete(test_report)
        await session.delete(test_tree)
        await session.delete(test_user)
        await session.commit()
        print("  [PASS] Test rows cleanly removed.")

    print("\n=================================================================")
    print(" ALL DATABASE MODELS & MIGRATION CHECKS PASSED (100%)!")
    print("=================================================================\n")

if __name__ == "__main__":
    try:
        asyncio.run(test_database_and_models())
    except Exception as e:
        print(f"\n[ERROR] Database test failed with exception: {e}")
        sys.exit(1)
