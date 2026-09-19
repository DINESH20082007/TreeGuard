import os
import uuid
import logging
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.report import Report, ReportStatusHistory
from app.models.user import User
from app.models.assignment import Assignment
from app.schemas.report import ReportResponse, ReportTimelineStep, ReportStatusHistoryResponse

logger = logging.getLogger("treeguard.reports")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Magic byte signatures
MAGIC_BYTES = {
    "jpeg": b"\xff\xd8\xff",
    "png": b"\x89PNG\r\n\x1a\n",
    "webp": b"RIFF",
}

class ReportService:
    @staticmethod
    def calculate_priority(issue_type: str) -> str:
        t = issue_type.lower()
        if t in ["fallen", "storm", "infrastructure"]:
            return "High"
        elif t in ["branch", "trunk", "blocking"]:
            return "Medium"
        else:
            return "Low"

    @staticmethod
    def format_step_date(dt: Optional[datetime]) -> Optional[str]:
        if not dt:
            return None
        return dt.strftime("%b %d, %Y, %I:%M %p")

    @classmethod
    def build_report_timeline(cls, report: Report) -> List[ReportTimelineStep]:
        """
        Builds a clear, chronological, real-data timeline for the report.
        """
        st = report.status.lower() if report.status else "pending"

        # Determine step completion flags based on real database state & timestamps
        is_submitted = True
        is_ai_assessment = True
        is_under_review = report.reviewed_at is not None or st in [
            "under-review", "assigned", "in-progress", "inspection-in-progress",
            "inspection-completed", "service-required", "service-in-progress",
            "service-completed", "follow-up-required", "resolved"
        ]
        is_assigned = report.assigned_at is not None or st in [
            "assigned", "in-progress", "inspection-in-progress",
            "inspection-completed", "service-required", "service-in-progress",
            "service-completed", "follow-up-required", "resolved"
        ]
        is_inspection_started = report.inspection_started_at is not None or st in [
            "in-progress", "inspection-in-progress", "inspection-completed",
            "service-required", "service-in-progress", "service-completed",
            "follow-up-required", "resolved"
        ]
        is_inspection_completed = report.inspection_completed_at is not None or st in [
            "inspection-completed", "service-required", "service-in-progress",
            "service-completed", "resolved"
        ]
        is_service_completed = report.service_completed_at is not None or bool(report.work_performed)
        is_service_needed = is_service_completed or report.service_started_at is not None or st in [
            "service-required", "service-in-progress", "service-completed"
        ]
        is_service_started = report.service_started_at is not None or st in [
            "service-in-progress", "service-completed"
        ]
        is_resolved = st == "resolved" or report.resolved_at is not None

        steps: List[ReportTimelineStep] = []

        # 1. Submitted
        steps.append(ReportTimelineStep(
            label="Submitted",
            status="completed" if is_submitted else "pending",
            date=cls.format_step_date(report.created_at),
            timestamp=report.created_at,
            note=report.description or "Report received and queued for operational review.",
            done=is_submitted,
        ))

        # 2. AI Assessment
        steps.append(ReportTimelineStep(
            label="AI Assessment",
            status="completed" if is_ai_assessment else "pending",
            date=cls.format_step_date(report.created_at),
            timestamp=report.created_at,
            note=f"Preliminary {report.priority.lower()} severity indicator logged for arborist review.",
            done=is_ai_assessment,
        ))

        # 3. Under Review
        review_date = cls.format_step_date(report.reviewed_at) if report.reviewed_at else (
            cls.format_step_date(report.created_at) if is_under_review else None
        )
        steps.append(ReportTimelineStep(
            label="Under Review",
            status="completed" if is_under_review else ("current" if st == "pending" else "pending"),
            date=review_date,
            timestamp=report.reviewed_at,
            note="Staff reviewed submission telemetry and verified coordinates." if is_under_review else "Awaiting arborist telemetry review.",
            done=is_under_review,
        ))

        # 4. Inspector Assigned
        assign_date = cls.format_step_date(report.assigned_at)
        assign_note = f"Assigned to {report.assigned_inspector_name or 'Municipal Field Crew'}." if is_assigned else "Pending inspector dispatch."
        steps.append(ReportTimelineStep(
            label="Inspector Assigned",
            status="completed" if is_assigned else ("current" if st == "under-review" else "pending"),
            date=assign_date,
            timestamp=report.assigned_at,
            note=assign_note,
            done=is_assigned,
        ))

        # 5. Inspection Completed
        insp_date = cls.format_step_date(report.inspection_completed_at)
        insp_note = "Field inspection completed by assigned arborist." if is_inspection_completed else (
            "Field inspection in progress on-site." if is_inspection_started else "Scheduled for field inspection."
        )
        steps.append(ReportTimelineStep(
            label="Inspection Completed",
            status="completed" if is_inspection_completed else ("current" if is_inspection_started or st == "assigned" else "pending"),
            date=insp_date,
            timestamp=report.inspection_completed_at,
            note=insp_note,
            done=is_inspection_completed,
        ))

        # 6. Work Completed (included if maintenance was required / performed)
        if is_service_needed or is_service_completed:
            srv_date = cls.format_step_date(report.service_completed_at)
            srv_note = (
                f"Work completed: {report.work_performed}."
                if (is_service_completed and report.work_performed)
                else (
                    "Required tree maintenance and care was completed."
                    if is_service_completed
                    else ("Tree maintenance in progress on-site." if is_service_started else "Maintenance service scheduled.")
                )
            )
            steps.append(ReportTimelineStep(
                label="Work Completed",
                status="completed" if is_service_completed else ("current" if is_service_started or st == "service-required" else "pending"),
                date=srv_date,
                timestamp=report.service_completed_at,
                note=srv_note,
                done=is_service_completed,
            ))

        # 7. Complete Report / Report Completed
        res_date = cls.format_step_date(report.resolved_at or (report.updated_at if is_resolved else None))
        res_note = (
            f"The reported issue has been resolved. Work completed: {report.work_performed or 'Field tasks verified.'}"
            if is_resolved
            else ("All field tasks completed. Ready for final report resolution." if (is_service_completed or (is_inspection_completed and not is_service_needed)) else "Final resolution pending completion of operational field tasks.")
        )
        steps.append(ReportTimelineStep(
            label="Report Completed" if is_resolved else "Complete Report",
            status="completed" if is_resolved else ("current" if (is_service_completed or (is_inspection_completed and not is_service_needed)) else "pending"),
            date=res_date if is_resolved else None,
            timestamp=report.resolved_at,
            note=res_note,
            done=is_resolved,
        ))

        return steps

    @staticmethod
    async def validate_and_save_image(file: UploadFile) -> str:
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid tree photo is required."
            )

        _, ext = os.path.splitext(file.filename.lower())
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
            )

        if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file content type '{file.content_type}'. Must be a valid image."
            )

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded image file is empty."
            )

        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image file exceeds maximum allowable size of {max_mb}MB."
            )

        is_valid_magic = False
        if ext in [".jpg", ".jpeg"] and content.startswith(MAGIC_BYTES["jpeg"]):
            is_valid_magic = True
        elif ext == ".png" and content.startswith(MAGIC_BYTES["png"]):
            is_valid_magic = True
        elif ext == ".webp" and content.startswith(MAGIC_BYTES["webp"]):
            is_valid_magic = True

        if not is_valid_magic:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupted or invalid image file content."
            )

        safe_filename = f"{uuid.uuid4().hex}{ext}"
        reports_dir = os.path.abspath(os.path.join(settings.UPLOAD_DIR, "reports"))
        os.makedirs(reports_dir, exist_ok=True)
        file_path = os.path.abspath(os.path.join(reports_dir, safe_filename))

        if not file_path.startswith(reports_dir) or os.path.commonpath([file_path, reports_dir]) != reports_dir:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path detected."
            )

        with open(file_path, "wb") as f:
            f.write(content)

        return f"/uploads/reports/{safe_filename}"

    @staticmethod
    async def generate_unique_report_id(db: AsyncSession) -> str:
        for _ in range(10):
            suffix = str(uuid.uuid4().int)[:4].zfill(4)
            candidate_id = f"TRG-2026-{suffix}"
            existing = await db.execute(select(Report).where(Report.id == candidate_id))
            if not existing.scalars().first():
                return candidate_id
        return f"TRG-2026-{uuid.uuid4().hex[:4].upper()}"

    @classmethod
    async def create_report(
        cls,
        db: AsyncSession,
        user: User,
        image_file: UploadFile,
        issue_type: str,
        location_name: str,
        description: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        observed_at: Optional[str] = None,
        additional_notes: Optional[str] = None,
    ) -> Report:
        if not issue_type or not issue_type.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Issue type is required."
            )

        if not location_name or not location_name.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Location address or landmark is required."
            )

        image_url = await cls.validate_and_save_image(image_file)
        report_id = await cls.generate_unique_report_id(db)
        priority = cls.calculate_priority(issue_type)
        now = datetime.now(timezone.utc)

        report = Report(
            id=report_id,
            reporter_id=user.id,
            issue_type=issue_type.strip(),
            description=description.strip() if description else None,
            location_name=location_name.strip(),
            latitude=latitude,
            longitude=longitude,
            image_url=image_url,
            priority=priority,
            status="pending",
            observed_at=observed_at.strip() if observed_at else None,
            additional_notes=additional_notes.strip() if additional_notes else None,
            created_at=now,
            updated_at=now,
        )

        db.add(report)

        # Create initial status history records
        history_submitted = ReportStatusHistory(
            id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
            report_id=report_id,
            status="pending",
            stage_name="Submitted",
            note=description.strip() if description else "Report received and queued for operational review.",
            created_at=now,
        )
        history_ai = ReportStatusHistory(
            id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
            report_id=report_id,
            status="pending",
            stage_name="AI Telemetry Assessment",
            note=f"Preliminary {priority.lower()} severity indicator logged for arborist review.",
            created_at=now,
        )
        db.add_all([history_submitted, history_ai])

        await db.commit()
        await db.refresh(report)

        # Send notification to reporting citizen
        try:
            from app.services.notification_service import notification_service
            await notification_service.create_notification(
                db=db,
                user_id=user.id,
                type="update",
                title=f"Report {report.id} Submitted",
                message=f"Your {report.issue_type} report for {report.location_name} has been received and queued for field review.",
                related_entity_type="report",
                related_entity_id=report.id,
                priority=priority.lower() if priority else "normal",
            )
        except Exception as e:
            logger.warning(f"Could not create submission notification: {e}")

        return report

    @classmethod
    async def add_status_history(
        cls,
        db: AsyncSession,
        report_id: str,
        status_val: str,
        stage_name: str,
        note: Optional[str] = None,
        timestamp: Optional[datetime] = None,
    ) -> ReportStatusHistory:
        """
        Appends a real timestamped status history entry for the report.
        """
        now = timestamp or datetime.now(timezone.utc)
        history_entry = ReportStatusHistory(
            id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
            report_id=report_id,
            status=status_val,
            stage_name=stage_name,
            note=note,
            created_at=now,
        )
        db.add(history_entry)
        return history_entry

    @classmethod
    async def review_report(
        cls,
        db: AsyncSession,
        report_id: str,
        reviewer_user: User,
        notes: Optional[str] = None,
    ) -> Report:
        """
        Transitions report to 'under-review' and records real reviewer verification.
        """
        report = await cls.get_report_by_id(db, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found.")

        if report.status in ["resolved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot review an already resolved or closed report."
            )

        now = datetime.now(timezone.utc)
        report.status = "under-review"
        report.reviewed_at = now
        report.updated_at = now

        note_text = notes or "Staff reviewed submission telemetry and verified coordinates."
        await cls.add_status_history(
            db=db,
            report_id=report.id,
            status_val="under-review",
            stage_name="Under Review",
            note=note_text,
            timestamp=now,
        )

        await db.commit()
        await db.refresh(report)

        # Notify reporter
        try:
            from app.services.notification_service import notification_service
            await notification_service.create_notification(
                db=db,
                user_id=report.reporter_id,
                type="update",
                title=f"Report {report.id} Under Review",
                message=f"Your tree report for {report.location_name} is now under review by municipal staff.",
                related_entity_type="report",
                related_entity_id=report.id,
                priority="normal",
            )
        except Exception as e:
            logger.warning(f"Could not create review notification: {e}")

        return report

    @classmethod
    async def assign_inspector(
        cls,
        db: AsyncSession,
        report_id: str,
        inspector_id: str,
        assigned_by_user: User,
        notes: Optional[str] = None,
        priority_override: Optional[str] = None,
        due_date: Optional[datetime] = None,
    ) -> Report:
        """
        Assigns a field inspector to the report, creating a linked Assignment and updating report lifecycle.
        """
        report = await cls.get_report_by_id(db, report_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found.")

        if report.status in ["resolved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign an inspector to an already resolved report."
            )

        # Fetch inspector
        insp_stmt = select(User).where(User.id == inspector_id)
        insp_res = await db.execute(insp_stmt)
        inspector = insp_res.scalars().first()
        if not inspector:
            raise HTTPException(status_code=404, detail=f"Inspector '{inspector_id}' not found.")

        now = datetime.now(timezone.utc)
        report.status = "assigned"
        report.assigned_inspector_id = inspector.id
        report.assigned_inspector_name = inspector.full_name
        report.assigned_at = now
        if not report.reviewed_at:
            report.reviewed_at = now
        report.updated_at = now

        # Create or link Assignment
        asn_stmt = select(Assignment).where(Assignment.report_id == report.id)
        existing_asn = (await db.execute(asn_stmt)).scalars().first()

        eff_prio = priority_override or report.priority
        if not existing_asn:
            new_asn = Assignment(
                id=f"ASN-{uuid.uuid4().hex[:6].upper()}-0107",
                inspector_id=inspector.id,
                report_id=report.id,
                tree_id=report.tree_id,
                title=f"{report.issue_type.capitalize()} — {report.location_name}",
                location_name=report.location_name,
                latitude=report.latitude,
                longitude=report.longitude,
                image_url=report.image_url,
                priority=eff_prio,
                status="assigned",
                inspection_status="Assigned",
                service_required=False,
                service_status="Not Required",
                notes=notes or report.description,
                assigned_at=now,
                due_date=due_date or (now + datetime.resolution),
                created_at=now,
                updated_at=now,
            )
            db.add(new_asn)
        else:
            existing_asn.inspector_id = inspector.id
            existing_asn.status = "assigned"
            existing_asn.inspection_status = "Assigned"
            existing_asn.updated_at = now

        # Add status history
        await cls.add_status_history(
            db=db,
            report_id=report.id,
            status_val="assigned",
            stage_name="Inspector Assigned",
            note=f"Assigned to {inspector.full_name}.",
            timestamp=now,
        )

        await db.commit()
        await db.refresh(report)

        # Notify reporter
        try:
            from app.services.notification_service import notification_service
            await notification_service.create_notification(
                db=db,
                user_id=report.reporter_id,
                type="assignment",
                title=f"Inspector Assigned: Report {report.id}",
                message=f"Field inspector {inspector.full_name} has been assigned to inspect the reported tree at {report.location_name}.",
                related_entity_type="report",
                related_entity_id=report.id,
                priority="high" if eff_prio == "High" else "normal",
            )
        except Exception as e:
            logger.warning(f"Could not create assign notification: {e}")

        return report

    @classmethod
    async def start_inspection_for_report(
        cls,
        db: AsyncSession,
        report_id: str,
        user: User,
        notes: Optional[str] = None,
    ) -> Report:
        report = await cls.get_report_by_id(db, report_id)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report with ID '{report_id}' not found.")
        
        # Check authorization: user must be admin or assigned inspector
        if user.role != "admin" and report.assigned_inspector_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to start inspection for this report.")

        if report.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start inspection: an inspector must be assigned first."
            )
        if report.status in ["resolved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start inspection on an already resolved report."
            )

        now = datetime.now(timezone.utc)
        report.status = "in-progress"
        report.inspection_started_at = now
        report.updated_at = now

        # Update linked assignment
        stmt = select(Assignment).where(Assignment.report_id == report.id)
        asn_res = await db.execute(stmt)
        assignment = asn_res.scalars().first()
        if assignment:
            assignment.inspection_status = "In Progress"
            assignment.status = "in-progress"
            assignment.inspection_started_at = now
            assignment.updated_at = now

        await cls.add_status_history(
            db=db,
            report_id=report.id,
            status_val="in-progress",
            stage_name="Inspection In Progress",
            note=notes or "Field inspector arrived on-site and commenced inspection.",
            timestamp=now,
        )
        await db.commit()
        await db.refresh(report)
        return report

    @classmethod
    async def complete_inspection_for_report(
        cls,
        db: AsyncSession,
        report_id: str,
        user: User,
        condition: str = "Fair",
        severity: str = "Moderate",
        notes: Optional[str] = None,
        recommended_action: Optional[str] = None,
        service_required: bool = False,
    ) -> Report:
        report = await cls.get_report_by_id(db, report_id)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report with ID '{report_id}' not found.")
        
        # Check authorization: user must be admin or assigned inspector
        if user.role != "admin" and report.assigned_inspector_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to complete inspection for this report.")

        if report.status in ["pending", "under-review"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete inspection: report has not been assigned to a field inspector."
            )
        if report.status in ["resolved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete inspection on an already resolved report."
            )

        now = datetime.now(timezone.utc)
        report.inspection_completed_at = now
        report.status = "service-required" if service_required else "inspection-completed"
        report.updated_at = now

        # Update linked assignment
        stmt = select(Assignment).where(Assignment.report_id == report.id)
        asn_res = await db.execute(stmt)
        assignment = asn_res.scalars().first()
        if assignment:
            assignment.inspection_status = "Inspection Completed"
            assignment.inspection_completed_at = now
            assignment.service_required = service_required
            assignment.service_status = "Required" if service_required else "Not Required"
            assignment.status = "in-progress" if service_required else "completed"
            if not service_required:
                assignment.completed_at = now
            assignment.updated_at = now

        insp_note = f"Condition: {condition}. Severity: {severity}."
        if recommended_action:
            insp_note += f" Action: {recommended_action}."
        if notes:
            insp_note += f" {notes}"

        await cls.add_status_history(
            db=db,
            report_id=report.id,
            status_val="inspection-completed",
            stage_name="Inspection Completed",
            note=insp_note,
            timestamp=now,
        )

        if service_required:
            await cls.add_status_history(
                db=db,
                report_id=report.id,
                status_val="service-required",
                stage_name="Service Required",
                note=f"Scheduled for tree maintenance: {recommended_action or 'Physical care / hazard removal needed'}.",
                timestamp=now,
            )

        await db.commit()
        await db.refresh(report)
        return report

    @classmethod
    async def complete_work_for_report(
        cls,
        db: AsyncSession,
        report_id: str,
        user: User,
        work_performed: str,
        completion_notes: Optional[str] = None,
    ) -> Report:
        report = await cls.get_report_by_id(db, report_id)
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report with ID '{report_id}' not found.")
        
        # Check authorization: user must be admin or assigned inspector
        if user.role != "admin" and report.assigned_inspector_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to complete work for this report.")

        if not work_performed or not work_performed.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Please specify the work performed."
            )

        if report.status in ["pending", "under-review", "assigned"] and not report.inspection_completed_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete work before field inspection has been completed."
            )

        if report.status in ["resolved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete work on an already resolved report."
            )

        now = datetime.now(timezone.utc)
        report.work_performed = work_performed.strip()
        report.completion_notes = completion_notes.strip() if completion_notes else None
        report.service_completed_at = now
        report.status = "service-completed"
        report.updated_at = now

        # Update linked assignment
        stmt = select(Assignment).where(Assignment.report_id == report.id)
        asn_res = await db.execute(stmt)
        assignment = asn_res.scalars().first()
        if assignment:
            assignment.service_status = "Service Completed"
            assignment.service_completed_at = now
            assignment.service_performed = work_performed.strip()
            assignment.service_notes = completion_notes.strip() if completion_notes else None
            assignment.status = "completed"
            assignment.completed_at = now
            assignment.updated_at = now

        await cls.add_status_history(
            db=db,
            report_id=report.id,
            status_val="service-completed",
            stage_name="Work Completed",
            note=f"Work performed: {work_performed.strip()}. Notes: {completion_notes.strip() if completion_notes else 'All clear.'}",
            timestamp=now,
        )

        await db.commit()
        await db.refresh(report)
        return report

    @classmethod
    async def complete_report(
        cls,
        db: AsyncSession,
        report_id: str,
        user: User,
        notes: Optional[str] = None,
        work_performed: Optional[str] = None,
    ) -> Report:
        report = await cls.get_report_by_id(db, report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report with ID '{report_id}' not found."
            )

        # Authorization check: must be admin or assigned inspector
        if user.role != "admin" and report.assigned_inspector_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned field inspector or organization admin can complete this report."
            )

        # Workflow validation checks (Requirement 12)
        if report.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete report: this report is still pending initial operational review."
            )

        if report.status in ["assigned", "in-progress", "inspection-in-progress"] and not report.inspection_completed_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete report: field inspection must be completed first."
            )

        if report.status in ["service-required", "service-in-progress"] and not report.service_completed_at and not report.work_performed and not work_performed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete report: required physical maintenance and tree service must be completed first."
            )

        now = datetime.now(timezone.utc)
        report.status = "resolved"
        report.resolved_at = now
        report.updated_at = now
        if work_performed and work_performed.strip():
            report.work_performed = work_performed.strip()
        if notes and notes.strip() and not report.completion_notes:
            report.completion_notes = notes.strip()

        # Update linked assignment if present
        stmt = select(Assignment).where(Assignment.report_id == report.id)
        asn_res = await db.execute(stmt)
        assignment = asn_res.scalars().first()
        if assignment:
            assignment.status = "completed"
            assignment.completed_at = now
            if assignment.service_required and assignment.service_status != "Service Completed":
                assignment.service_status = "Service Completed"
                assignment.service_completed_at = now
            if assignment.inspection_status != "Inspection Completed":
                assignment.inspection_status = "Inspection Completed"
                assignment.inspection_completed_at = now
            if work_performed and work_performed.strip():
                assignment.service_performed = work_performed.strip()
            assignment.updated_at = now

        # Add status history event
        history_note = notes.strip() if (notes and notes.strip()) else (
            f"All required work completed: {report.work_performed}."
            if report.work_performed
            else "All required field inspection and maintenance tasks have been verified and finalized."
        )
        await cls.add_status_history(
            db=db,
            report_id=report.id,
            status_val="resolved",
            stage_name="Report Completed",
            note=history_note,
            timestamp=now,
        )

        await db.commit()
        await db.refresh(report)

        # Send notification to reporter
        try:
            from app.services.notification_service import notification_service
            await notification_service.create_notification(
                db=db,
                user_id=report.reporter_id,
                type="resolved",
                title=f"Report Completed: {report.id}",
                message=f"All required work for your reported tree at {report.location_name} has been completed and verified. The report is now officially resolved.",
                related_entity_type="report",
                related_entity_id=report.id,
                priority="normal",
            )
        except Exception as e:
            logger.warning(f"Notification error: {e}")

        return report

    @classmethod
    async def get_user_reports(cls, db: AsyncSession, user_id: str) -> List[ReportResponse]:
        stmt = (
            select(Report)
            .options(selectinload(Report.status_history))
            .where(Report.reporter_id == user_id)
            .order_by(desc(Report.created_at))
        )
        result = await db.execute(stmt)
        reports = result.scalars().all()

        responses = []
        for r in reports:
            # If status_history is empty, seed baseline history
            if not r.status_history:
                await cls._ensure_baseline_history(db, r)
            timeline = cls.build_report_timeline(r)
            resp = ReportResponse.model_validate(r)
            resp.timeline = timeline
            responses.append(resp)

        return responses

    @classmethod
    async def get_all_reports(cls, db: AsyncSession) -> List[ReportResponse]:
        stmt = (
            select(Report)
            .options(selectinload(Report.status_history))
            .order_by(desc(Report.created_at))
        )
        result = await db.execute(stmt)
        reports = result.scalars().all()

        responses = []
        for r in reports:
            if not r.status_history:
                await cls._ensure_baseline_history(db, r)
            timeline = cls.build_report_timeline(r)
            resp = ReportResponse.model_validate(r)
            resp.timeline = timeline
            responses.append(resp)

        return responses

    @classmethod
    async def get_report_by_id(cls, db: AsyncSession, report_id: str) -> Optional[Report]:
        stmt = (
            select(Report)
            .options(selectinload(Report.status_history))
            .where(Report.id == report_id)
        )
        result = await db.execute(stmt)
        report = result.scalars().first()
        if report and not report.status_history:
            await cls._ensure_baseline_history(db, report)
        return report

    @classmethod
    async def get_report_response_by_id(cls, db: AsyncSession, report_id: str) -> Optional[ReportResponse]:
        report = await cls.get_report_by_id(db, report_id)
        if not report:
            return None
        timeline = cls.build_report_timeline(report)
        resp = ReportResponse.model_validate(report)
        resp.timeline = timeline
        return resp

    @classmethod
    async def _ensure_baseline_history(cls, db: AsyncSession, report: Report) -> None:
        """
        Backfills baseline history records for reports created before history tracking.
        """
        entries = []
        # Submitted
        entries.append(ReportStatusHistory(
            id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
            report_id=report.id,
            status="pending",
            stage_name="Submitted",
            note=report.description or "Report received and queued for operational review.",
            created_at=report.created_at,
        ))
        # AI Telemetry Assessment
        entries.append(ReportStatusHistory(
            id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
            report_id=report.id,
            status="pending",
            stage_name="AI Telemetry Assessment",
            note=f"Preliminary {report.priority.lower()} severity indicator logged for arborist review.",
            created_at=report.created_at,
        ))
        # If under review
        if report.reviewed_at or report.status in ["under-review", "assigned", "in-progress", "inspection-completed", "service-required", "service-in-progress", "service-completed", "resolved"]:
            entries.append(ReportStatusHistory(
                id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.id,
                status="under-review",
                stage_name="Under Review",
                note="Staff reviewed submission telemetry and verified coordinates.",
                created_at=report.reviewed_at or report.created_at,
            ))
        # If assigned
        if report.assigned_at or report.status in ["assigned", "in-progress", "inspection-completed", "service-required", "service-in-progress", "service-completed", "resolved"]:
            entries.append(ReportStatusHistory(
                id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.id,
                status="assigned",
                stage_name="Inspector Assigned",
                note=f"Assigned to {report.assigned_inspector_name or 'Municipal Field Crew'}.",
                created_at=report.assigned_at or report.created_at,
            ))
        # If inspection started
        if report.inspection_started_at or report.status in ["in-progress", "inspection-completed", "service-required", "service-in-progress", "service-completed", "resolved"]:
            entries.append(ReportStatusHistory(
                id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.id,
                status="in-progress",
                stage_name="Inspection In Progress",
                note="Field inspector has arrived on-site and commenced inspection.",
                created_at=report.inspection_started_at or report.updated_at,
            ))
        # If inspection completed
        if report.inspection_completed_at or report.status in ["inspection-completed", "service-required", "service-in-progress", "service-completed", "resolved"]:
            entries.append(ReportStatusHistory(
                id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.id,
                status="inspection-completed",
                stage_name="Inspection Completed",
                note="Field inspection completed.",
                created_at=report.inspection_completed_at or report.updated_at,
            ))
        # If service completed
        if report.service_completed_at or (report.status == "resolved" and report.service_started_at):
            entries.append(ReportStatusHistory(
                id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.id,
                status="service-completed",
                stage_name="Service Completed",
                note="Required maintenance was completed.",
                created_at=report.service_completed_at or report.updated_at,
            ))
        # If resolved
        if report.status == "resolved" or report.resolved_at:
            entries.append(ReportStatusHistory(
                id=f"RSH-{uuid.uuid4().hex[:8].upper()}",
                report_id=report.id,
                status="resolved",
                stage_name="Resolved",
                note="The reported issue has been resolved.",
                created_at=report.resolved_at or report.updated_at,
            ))

        db.add_all(entries)
        try:
            await db.commit()
            await db.refresh(report)
        except Exception:
            await db.rollback()

report_service = ReportService()
