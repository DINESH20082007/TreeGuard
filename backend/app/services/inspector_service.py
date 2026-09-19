import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.assignment import Assignment
from app.models.user import User
from app.models.tree import Tree
from app.schemas.assignment import AssignmentResponse, InspectorStatsResponse

logger = logging.getLogger("treeguard.inspector")

class InspectorService:
    @staticmethod
    async def get_inspector_assignments(db: AsyncSession, inspector_id: str) -> List[AssignmentResponse]:
        """
        Retrieves all assignments belonging to the specified inspector.
        """
        stmt = (
            select(Assignment)
            .where(Assignment.inspector_id == inspector_id)
            .order_by(Assignment.assigned_at.desc())
        )
        result = await db.execute(stmt)
        assignments = result.scalars().all()
        return [AssignmentResponse.model_validate(a) for a in assignments]

    @staticmethod
    async def get_inspector_stats(db: AsyncSession, inspector_id: str) -> InspectorStatsResponse:
        """
        Calculates real dynamic dashboard statistics for the specified inspector.
        """
        stmt = select(Assignment).where(Assignment.inspector_id == inspector_id)
        result = await db.execute(stmt)
        assignments = result.scalars().all()

        if not assignments:
            return InspectorStatsResponse(
                assigned_today=0,
                high_priority=0,
                pending_inspection=0,
                completed_this_week=0,
                emergency_cases=0,
            )

        now = datetime.now(timezone.utc)
        today = now.date()
        one_week_ago = now - timedelta(days=7)

        assigned_today = 0
        high_priority = 0
        pending_inspection = 0
        completed_this_week = 0
        emergency_cases = 0
        service_required_count = 0
        service_in_progress_count = 0
        service_completed_count = 0

        for a in assignments:
            assigned_date = a.assigned_at.date() if a.assigned_at else None
            insp_st = getattr(a, "inspection_status", "Assigned") or "Assigned"
            srv_st = getattr(a, "service_status", "Not Required") or "Not Required"
            
            # Assigned today (or active non-completed assigned today)
            if assigned_date == today or a.status in ["assigned", "emergency"] or insp_st == "Assigned":
                assigned_today += 1

            # High / Emergency active priority
            if a.priority in ["High", "Emergency"] and a.status != "completed":
                high_priority += 1

            # Pending inspection
            if insp_st in ["Assigned", "In Progress", "Follow-up Required"] or a.status in ["assigned", "pending", "under-review", "emergency"]:
                if a.status != "completed" and insp_st != "Inspection Completed":
                    pending_inspection += 1

            # Completed this week
            if a.status == "completed" or insp_st == "Inspection Completed":
                comp_time = a.completed_at or getattr(a, "inspection_completed_at", None) or a.updated_at
                if comp_time:
                    if comp_time.tzinfo is None:
                        comp_time = comp_time.replace(tzinfo=timezone.utc)
                    if comp_time >= one_week_ago:
                        completed_this_week += 1

            # Emergency cases
            if a.priority == "Emergency" or a.status == "emergency":
                if a.status != "completed":
                    emergency_cases += 1

            # Service tracking
            if getattr(a, "service_required", False) and srv_st == "Required":
                service_required_count += 1
            elif srv_st == "Service In Progress":
                service_in_progress_count += 1
            elif srv_st == "Service Completed":
                service_completed_count += 1

        return InspectorStatsResponse(
            assigned_today=assigned_today,
            high_priority=high_priority,
            pending_inspection=pending_inspection,
            completed_this_week=completed_this_week,
            emergency_cases=emergency_cases,
            service_required=service_required_count,
            service_in_progress=service_in_progress_count,
            service_completed=service_completed_count,
        )

    @staticmethod
    async def get_assignment_by_id(db: AsyncSession, assignment_id: str) -> Optional[Assignment]:
        """
        Retrieves a single assignment by its ID.
        """
        stmt = select(Assignment).where(Assignment.id == assignment_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def seed_initial_inspector_assignments_if_empty(db: AsyncSession, inspector_id: str) -> None:
        """
        Seeds standard initial assignments for a field inspector if their queue is currently empty.
        """
        stmt = select(func.count(Assignment.id)).where(Assignment.inspector_id == inspector_id)
        res = await db.execute(stmt)
        count = res.scalar() or 0

        if count > 0:
            return

        now = datetime.now(timezone.utc)
        prefix = inspector_id.replace("-", "")[:6].upper()
        initial_records = [
            Assignment(
                id=f"ASN-{prefix}-0084",
                inspector_id=inspector_id,
                tree_id="TRE-0392",
                title="Trunk damage — co-dominant stem failure",
                location_name="Race Course Road Promenade, Coimbatore",
                latitude=11.0020,
                longitude=76.9730,
                image_url="https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&h=400&fit=crop&auto=format",
                priority="High",
                status="assigned",
                ai_assessment="Structural risk — high confidence (89%)",
                notes="Citizen report logged large split at trunk union. Verify load bearing capacity.",
                assigned_at=now - timedelta(days=2),
                due_date=now + timedelta(days=2),
            ),
            Assignment(
                id=f"ASN-{prefix}-0107",
                inspector_id=inspector_id,
                tree_id="TRE-0481",
                title="Fallen tree — road obstruction",
                location_name="DB Road, RS Puram, Coimbatore",
                latitude=11.0086,
                longitude=76.9489,
                image_url="https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=400&fit=crop&auto=format",
                priority="Emergency",
                status="emergency",
                ai_assessment="Emergency — fallen tree detected (94%)",
                notes="Active road blockage confirmed. Coordinate immediate dispatch and removal.",
                assigned_at=now - timedelta(minutes=15),
                due_date=now + timedelta(hours=4),
            ),
            Assignment(
                id=f"ASN-{prefix}-0091",
                inspector_id=inspector_id,
                tree_id="TRE-0392",
                title="Broken branch — Saibaba Colony Park",
                location_name="NSR Road, Saibaba Colony, Coimbatore",
                latitude=11.0286,
                longitude=76.9450,
                image_url="https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=400&h=400&fit=crop&auto=format",
                priority="Medium",
                status="assigned",
                ai_assessment="Moderate severity — 82% confidence",
                notes="Hanging limb over public walkway. Trimming crew recommended.",
                assigned_at=now - timedelta(days=3),
                due_date=now + timedelta(days=3),
            ),
            Assignment(
                id=f"ASN-{prefix}-0078",
                inspector_id=inspector_id,
                tree_id="TRE-0612",
                title="Tree health concern — canopy thinning",
                location_name="Cross Cut Road, Gandhipuram, Coimbatore",
                latitude=11.0183,
                longitude=76.9667,
                image_url="https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&h=400&fit=crop&auto=format",
                priority="Low",
                status="under-review",
                ai_assessment="Drought stress suspected — 71% confidence",
                notes="Foliage thinning observed across upper third of crown.",
                assigned_at=now - timedelta(days=4),
                due_date=now + timedelta(days=7),
            ),
        ]

        db.add_all(initial_records)
        await db.commit()
        logger.info(f"Seeded {len(initial_records)} initial assignments for inspector {inspector_id}.")

    @staticmethod
    async def update_assignment_workflow(
        db: AsyncSession,
        assignment_id: str,
        inspector_id: str,
        action: Optional[str] = None,
        inspection_status: Optional[str] = None,
        service_required: Optional[bool] = None,
        service_status: Optional[str] = None,
        condition: Optional[str] = None,
        severity: Optional[str] = None,
        notes: Optional[str] = None,
        recommended_action: Optional[str] = None,
        service_performed: Optional[str] = None,
        service_notes: Optional[str] = None,
        work_performed: Optional[str] = None,
        completion_notes: Optional[str] = None,
    ) -> Assignment:
        """
        Updates the assignment inspection and service lifecycle with strict workflow validations.
        """
        assignment = await InspectorService.get_assignment_by_id(db, assignment_id)
        if not assignment:
            raise ValueError(f"Assignment with ID '{assignment_id}' not found.")

        now = datetime.now(timezone.utc)
        assignment.updated_at = now

        # Helper to fetch linked report
        report = None
        if assignment.report_id:
            from app.models.report import Report
            report_stmt = select(Report).where(Report.id == assignment.report_id)
            report_res = await db.execute(report_stmt)
            report = report_res.scalars().first()

        # 1. Action: START INSPECTION
        if action == "start_inspection" or (inspection_status == "In Progress" and assignment.inspection_status == "Assigned"):
            assignment.inspection_status = "In Progress"
            assignment.status = "in-progress"
            if not assignment.inspection_started_at:
                assignment.inspection_started_at = now

            if report:
                report.status = "in-progress"
                report.inspection_started_at = now
                report.updated_at = now
                from app.services.report_service import report_service
                await report_service.add_status_history(
                    db=db,
                    report_id=report.id,
                    status_val="in-progress",
                    stage_name="Inspection In Progress",
                    note="Field inspector has commenced on-site assessment.",
                    timestamp=now,
                )
                try:
                    from app.services.notification_service import notification_service
                    await notification_service.create_notification(
                        db=db,
                        user_id=report.reporter_id,
                        type="update",
                        title=f"Inspection Started: Report {report.id}",
                        message=f"A field inspector has commenced on-site assessment for your reported tree at {report.location_name}.",
                        related_entity_type="report",
                        related_entity_id=report.id,
                        priority="normal",
                    )
                except Exception as e:
                    logger.warning(f"Notification error: {e}")

        # 2. Action: MARK FOLLOW-UP REQUIRED
        elif action == "follow_up_required" or inspection_status == "Follow-up Required":
            assignment.inspection_status = "Follow-up Required"
            assignment.status = "under-review"
            if notes:
                new_note = f"[Follow-up Required]: {notes}"
                assignment.notes = f"{assignment.notes}\n{new_note}" if assignment.notes else new_note

            if report:
                report.status = "follow-up-required"
                report.updated_at = now
                from app.services.report_service import report_service
                await report_service.add_status_history(
                    db=db,
                    report_id=report.id,
                    status_val="follow-up-required",
                    stage_name="Follow-up Required",
                    note=f"Follow-up visit required: {notes or 'Secondary arborist evaluation scheduled'}.",
                    timestamp=now,
                )
                try:
                    from app.services.notification_service import notification_service
                    await notification_service.create_notification(
                        db=db,
                        user_id=report.reporter_id,
                        type="update",
                        title=f"Follow-up Scheduled: Report {report.id}",
                        message=f"A follow-up inspection visit has been scheduled for your reported tree at {report.location_name}.",
                        related_entity_type="report",
                        related_entity_id=report.id,
                        priority="normal",
                    )
                except Exception as e:
                    logger.warning(f"Notification error: {e}")

        # 3. Action: MARK INSPECTION COMPLETED
        elif action == "complete_inspection" or inspection_status == "Inspection Completed":
            # Validation: condition and severity should be recorded
            eff_condition = condition or "Fair"
            eff_severity = severity or "Moderate"
            
            assignment.inspection_status = "Inspection Completed"
            assignment.inspection_completed_at = now

            # Append findings to notes
            findings = [f"Condition: {eff_condition}", f"Severity: {eff_severity}"]
            if recommended_action:
                findings.append(f"Action: {recommended_action}")
            if notes:
                findings.append(f"Notes: {notes}")
            new_finding_str = " | ".join(findings)
            assignment.notes = f"{assignment.notes}\n[Inspection Findings]: {new_finding_str}" if assignment.notes else f"[Inspection Findings]: {new_finding_str}"

            # Check service requirement
            if service_required is not None:
                assignment.service_required = service_required
            
            if assignment.service_required:
                if service_status:
                    assignment.service_status = service_status
                elif assignment.service_status not in ["Required", "Service In Progress"]:
                    assignment.service_status = "Required"
                assignment.status = "in-progress" if assignment.service_status != "Service Completed" else "completed"
            else:
                assignment.service_status = "Not Required"
                assignment.status = "completed"
                assignment.completed_at = now

            # Update linked tree
            if assignment.tree_id:
                tree_stmt = select(Tree).where(Tree.id == assignment.tree_id)
                tree_res = await db.execute(tree_stmt)
                tree = tree_res.scalars().first()
                if tree:
                    tree.last_inspection = now.strftime("%b %d, %Y")
                    if eff_condition.lower() == "critical":
                        tree.status = "emergency"
                        tree.health_score = min(tree.health_score, 25)
                    elif eff_condition.lower() == "poor":
                        tree.status = "at-risk"
                        tree.health_score = min(tree.health_score, 48)
                    elif eff_condition.lower() == "good" and tree.status in ["monitoring", "at-risk"]:
                        tree.health_score = max(tree.health_score, 82)
                    tree.updated_at = now

            # Update linked report
            if report:
                report.inspection_completed_at = now
                report.updated_at = now
                from app.services.report_service import report_service

                if assignment.service_required:
                    report.status = "service-required"
                    await report_service.add_status_history(
                        db=db,
                        report_id=report.id,
                        status_val="inspection-completed",
                        stage_name="Inspection Completed",
                        note=f"Field inspection completed. Condition: {eff_condition}.",
                        timestamp=now,
                    )
                    await report_service.add_status_history(
                        db=db,
                        report_id=report.id,
                        status_val="service-required",
                        stage_name="Service Required",
                        note=f"Scheduled for tree maintenance: {recommended_action or 'Tree surgery/care'}.",
                        timestamp=now,
                    )
                    try:
                        from app.services.notification_service import notification_service
                        await notification_service.create_notification(
                            db=db,
                            user_id=report.reporter_id,
                            type="update",
                            title=f"Inspection Completed: Report {report.id}",
                            message=f"Inspection of your reported tree at {report.location_name} is complete. Maintenance has been scheduled.",
                            related_entity_type="report",
                            related_entity_id=report.id,
                            priority="normal",
                        )
                    except Exception as e:
                        logger.warning(f"Notification error: {e}")
                else:
                    report.status = "inspection-completed"
                    await report_service.add_status_history(
                        db=db,
                        report_id=report.id,
                        status_val="inspection-completed",
                        stage_name="Inspection Completed",
                        note=f"Field inspection completed. Condition: {eff_condition}. No further maintenance needed.",
                        timestamp=now,
                    )
                    try:
                        from app.services.notification_service import notification_service
                        await notification_service.create_notification(
                            db=db,
                            user_id=report.reporter_id,
                            type="update",
                            title=f"Inspection Completed: Report {report.id}",
                            message=f"Inspection completed for your reported tree at {report.location_name}. Findings: {eff_condition}.",
                            related_entity_type="report",
                            related_entity_id=report.id,
                            priority="normal",
                        )
                    except Exception as e:
                        logger.warning(f"Notification error: {e}")

        # 4. Action: START SERVICE
        elif action == "start_service" or (service_status == "Service In Progress" and assignment.service_status in ["Required", "Not Required"]):
            if not assignment.service_required and service_required is not True:
                assignment.service_required = True
            assignment.service_status = "Service In Progress"
            assignment.status = "in-progress"

            if report:
                report.status = "service-in-progress"
                report.service_started_at = now
                report.updated_at = now
                from app.services.report_service import report_service
                await report_service.add_status_history(
                    db=db,
                    report_id=report.id,
                    status_val="service-in-progress",
                    stage_name="Service In Progress",
                    note="Tree maintenance crew has commenced service work.",
                    timestamp=now,
                )
                try:
                    from app.services.notification_service import notification_service
                    await notification_service.create_notification(
                        db=db,
                        user_id=report.reporter_id,
                        type="update",
                        title=f"Maintenance Started: Report {report.id}",
                        message=f"Maintenance and tree care work has begun for your reported tree at {report.location_name}.",
                        related_entity_type="report",
                        related_entity_id=report.id,
                        priority="normal",
                    )
                except Exception as e:
                    logger.warning(f"Notification error: {e}")

        # 5. Action: COMPLETE WORK / SERVICE
        elif action in ["complete_work", "complete_service"] or service_status == "Service Completed":
            if action == "complete_service" and not assignment.service_required and assignment.service_status == "Not Required" and service_required is not True:
                raise ValueError("Cannot mark service completed when service is not required.")

            eff_work = (work_performed or service_performed or "").strip()
            if not eff_work:
                eff_work = "Maintenance and physical tree service completed"
            eff_notes = (completion_notes or service_notes or "").strip()

            assignment.service_required = True
            assignment.service_status = "Service Completed"
            assignment.service_completed_at = now
            assignment.service_performed = eff_work
            assignment.service_notes = eff_notes
            assignment.status = "completed"
            assignment.completed_at = now

            if assignment.inspection_status != "Inspection Completed":
                assignment.inspection_status = "Inspection Completed"
                if not assignment.inspection_completed_at:
                    assignment.inspection_completed_at = now

            srv_note_entry = f"[Work Completed]: {eff_work}"
            if eff_notes:
                srv_note_entry += f" - {eff_notes}"
            assignment.notes = f"{assignment.notes}\n{srv_note_entry}" if assignment.notes else srv_note_entry

            if report:
                report.status = "service-completed"
                report.service_completed_at = now
                report.work_performed = eff_work
                report.completion_notes = eff_notes
                report.updated_at = now
                from app.services.report_service import report_service
                await report_service.add_status_history(
                    db=db,
                    report_id=report.id,
                    status_val="service-completed",
                    stage_name="Work Completed",
                    note=f"Work performed: {eff_work}. Notes: {eff_notes or 'Area inspected and made safe.'}",
                    timestamp=now,
                )
                try:
                    from app.services.notification_service import notification_service
                    await notification_service.create_notification(
                        db=db,
                        user_id=report.reporter_id,
                        type="update",
                        title=f"Work Completed: Report {report.id}",
                        message=f"Physical tree service completed ({eff_work}). Final report verification pending.",
                        related_entity_type="report",
                        related_entity_id=report.id,
                        priority="normal",
                    )
                except Exception as e:
                    logger.warning(f"Notification error: {e}")

        # Generic field updates with validation
        else:
            if inspection_status:
                assignment.inspection_status = inspection_status
            if service_required is not None:
                assignment.service_required = service_required
                if not service_required and assignment.service_status == "Required":
                    assignment.service_status = "Not Required"
                elif service_required and assignment.service_status == "Not Required":
                    assignment.service_status = "Required"
            if service_status:
                if service_status == "Service Completed" and not assignment.service_required:
                    raise ValueError("Cannot set Service Completed when Service Required is False.")
                assignment.service_status = service_status
            if service_performed or work_performed:
                assignment.service_performed = work_performed or service_performed
            if service_notes or completion_notes:
                assignment.service_notes = completion_notes or service_notes

        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def complete_assignment(
        db: AsyncSession,
        assignment_id: str,
        inspector_id: str,
        condition: str,
        severity: str,
        notes: Optional[str] = None,
        recommended_action: Optional[str] = None,
        service_required: Optional[bool] = False,
        service_status: Optional[str] = "Not Required",
        service_performed: Optional[str] = None,
        service_notes: Optional[str] = None,
    ) -> Optional[Assignment]:
        """
        Completes an arborist inspection assessment and persists inspection & service statuses.
        """
        return await InspectorService.update_assignment_workflow(
            db=db,
            assignment_id=assignment_id,
            inspector_id=inspector_id,
            action="complete_inspection",
            condition=condition,
            severity=severity,
            notes=notes,
            recommended_action=recommended_action,
            service_required=service_required,
            service_status=service_status,
            service_performed=service_performed,
            service_notes=service_notes,
        )

inspector_service = InspectorService()

