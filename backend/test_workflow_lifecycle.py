import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import async_session_maker, engine, Base
from app.models.user import User
from app.models.assignment import Assignment
from app.models.tree import Tree
from app.models.report import Report
from app.schemas.auth import RegisterRequest
from app.services.inspector_service import inspector_service
from app.services.auth_service import auth_service

async def test_workflow():
    print("Testing Inspection + Service Completion Workflow...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def check_and_migrate_tables(sync_conn):
            cursor = sync_conn.connection.cursor()
            try:
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
                        print(f"Added column {col_name} to inspector_assignments table.")
            except Exception as e:
                print(f"Migration error: {e}")

        await conn.run_sync(check_and_migrate_tables)

    async with async_session_maker() as db:
        # Create / fetch a test inspector user
        user = await auth_service.get_user_by_email(db, "inspector@treeguard.org")
        if not user:
            print("Creating test inspector user...")
            reg_req = RegisterRequest(
                email="inspector@treeguard.org",
                password="SecurePassword123!",
                full_name="Priya Natarajan",
                role="inspector",
            )
            user = await auth_service.register_user(db=db, data=reg_req)

        print(f"Using inspector ID: {user.id}")

        # Seed assignments
        await inspector_service.seed_initial_inspector_assignments_if_empty(db, user.id)
        assignments = await inspector_service.get_inspector_assignments(db, user.id)
        assert len(assignments) > 0, "No assignments found!"
        target_asn = assignments[0]
        print(f"Target Assignment: {target_asn.id} (Initial Inspection Status: {target_asn.inspection_status}, Service Status: {target_asn.service_status})")

        # Step 1: Start Inspection
        updated = await inspector_service.update_assignment_workflow(
            db=db,
            assignment_id=target_asn.id,
            inspector_id=user.id,
            action="start_inspection"
        )
        assert updated.inspection_status == "In Progress", f"Expected 'In Progress', got '{updated.inspection_status}'"
        assert updated.status == "in-progress"
        print("[OK] Step 1: Start Inspection -> 'In Progress' verified.")

        # Step 2: Complete Inspection with Service Required = True
        updated = await inspector_service.update_assignment_workflow(
            db=db,
            assignment_id=target_asn.id,
            inspector_id=user.id,
            action="complete_inspection",
            condition="Poor",
            severity="Severe",
            notes="Cracked limb threatening DB road pedestrian lane.",
            recommended_action="Crown thinning and branch bracing",
            service_required=True,
        )
        assert updated.inspection_status == "Inspection Completed", f"Expected 'Inspection Completed', got '{updated.inspection_status}'"
        assert updated.service_required is True
        assert updated.service_status == "Required", f"Expected 'Required', got '{updated.service_status}'"
        assert updated.status == "in-progress", f"Expected 'in-progress' while service is required, got '{updated.status}'"
        print("[OK] Step 2: Complete Inspection (Service Required=True) -> Inspection: 'Inspection Completed', Service: 'Required' verified.")

        # Step 3: Cannot mark Service Completed without starting or while not required
        # Step 3a: Start Service
        updated = await inspector_service.update_assignment_workflow(
            db=db,
            assignment_id=target_asn.id,
            inspector_id=user.id,
            action="start_service"
        )
        assert updated.service_status == "Service In Progress", f"Expected 'Service In Progress', got '{updated.service_status}'"
        print("[OK] Step 3: Start Service -> 'Service In Progress' verified.")

        # Step 4: Complete Service
        updated = await inspector_service.update_assignment_workflow(
            db=db,
            assignment_id=target_asn.id,
            inspector_id=user.id,
            action="complete_service",
            service_performed="Arborist limb reduction and crown stabilization",
            service_notes="Removed 2 hazardous broken limbs. Stabilized main union.",
        )
        assert updated.service_status == "Service Completed", f"Expected 'Service Completed', got '{updated.service_status}'"
        assert updated.status == "completed", f"Expected overall 'completed', got '{updated.status}'"
        assert updated.service_performed is not None
        assert updated.service_completed_at is not None
        print("[OK] Step 4: Complete Service -> 'Service Completed' and overall assignment 'completed' verified.")

        # Step 5: Test No-Service Workflow on another assignment
        if len(assignments) > 1:
            target_asn_2 = assignments[1]
            updated_2 = await inspector_service.update_assignment_workflow(
                db=db,
                assignment_id=target_asn_2.id,
                inspector_id=user.id,
                action="complete_inspection",
                condition="Good",
                severity="None",
                notes="Healthy canopy. Routine check complete.",
                service_required=False,
            )
            assert updated_2.inspection_status == "Inspection Completed"
            assert updated_2.service_required is False
            assert updated_2.service_status == "Not Required"
            assert updated_2.status == "completed"
            print("[OK] Step 5: Complete Inspection (Service Required=False) -> Inspection: 'Inspection Completed', Service: 'Not Required', overall: 'completed' verified.")

            # Test invalid transition: Cannot mark service completed when service_required is False
            try:
                await inspector_service.update_assignment_workflow(
                    db=db,
                    assignment_id=target_asn_2.id,
                    inspector_id=user.id,
                    action="complete_service"
                )
                assert False, "Should have raised ValueError for invalid service completion on non-required service!"
            except ValueError as val_err:
                print(f"[OK] Step 6: Validation prevented invalid service completion: {val_err}")

        # Step 7: Check Stats
        stats = await inspector_service.get_inspector_stats(db, user.id)
        print(f"Stats: completed_this_week={stats.completed_this_week}, service_completed={stats.service_completed}")
        assert stats.completed_this_week >= 1

    print("\nALL BACKEND WORKFLOW TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_workflow())
