import os
import uuid
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.emergency import EmergencyAnalysis
from app.models.user import User
from app.models.report import Report
from app.models.tree import Tree
from app.schemas.emergency import EmergencyAnalysisResponse

logger = logging.getLogger("treeguard.emergency")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Magic byte signatures
MAGIC_BYTES = {
    "jpeg": b"\xff\xd8\xff",
    "png": b"\x89PNG\r\n\x1a\n",
    "webp": b"RIFF",
}

class EmergencyService:
    @staticmethod
    async def validate_and_save_image(file: UploadFile) -> str:
        """
        Validates uploaded emergency image (extension, mime type, size, magic bytes)
        and securely saves it with a randomized UUID filename.
        """
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid emergency photo file is required."
            )

        # 1. Validate file extension
        _, ext = os.path.splitext(file.filename.lower())
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
            )

        # 2. Validate MIME type
        if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file content type '{file.content_type}'. Must be a valid image."
            )

        # 3. Read content and validate size & magic bytes
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded image file is empty."
            )

        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image file exceeds maximum allowable size of {max_mb}MB."
            )

        # Magic byte check
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

        # 4. Generate safe unique filename and write to disk with path containment
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        emergency_dir = os.path.abspath(os.path.join(settings.UPLOAD_DIR, "emergency"))
        os.makedirs(emergency_dir, exist_ok=True)
        file_path = os.path.abspath(os.path.join(emergency_dir, safe_filename))

        # Security check: Ensure file path does not escape the emergency upload directory
        if not file_path.startswith(emergency_dir) or os.path.commonpath([file_path, emergency_dir]) != emergency_dir:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path detected."
            )

        with open(file_path, "wb") as f:
            f.write(content)

        # Return web-accessible URL
        return f"/uploads/emergency/{safe_filename}"

    @staticmethod
    async def generate_unique_emergency_id(db: AsyncSession) -> str:
        """
        Generates a unique ID in the format EMG-2026-XXXX.
        """
        for _ in range(10):
            suffix = str(uuid.uuid4().int)[:4].zfill(4)
            candidate_id = f"EMG-2026-{suffix}"
            existing = await db.execute(select(EmergencyAnalysis).where(EmergencyAnalysis.id == candidate_id))
            if not existing.scalars().first():
                return candidate_id
        return f"EMG-2026-{uuid.uuid4().hex[:4].upper()}"

    @staticmethod
    def is_ai_model_configured() -> bool:
        """
        Checks whether a real computer vision / AI emergency model is configured.
        Returns False by default to maintain AI honesty when no model is integrated.
        """
        ai_enabled = os.getenv("EMERGENCY_AI_ENABLED", "false").lower() in ("true", "1", "yes")
        ai_model_path = os.getenv("EMERGENCY_AI_MODEL_PATH", "").strip()
        return bool(ai_enabled and ai_model_path and os.path.exists(ai_model_path))

    @classmethod
    def evaluate_emergency(cls, image_url: str) -> Dict[str, Any]:
        """
        Processes image through AI emergency detection logic.
        If no real AI model is configured, returns honest 'unavailable' state.
        """
        if not cls.is_ai_model_configured():
            logger.info("Emergency AI model is not configured. Returning honest 'unavailable' analysis state.")
            return {
                "analysis_status": "unavailable",
                "is_ai_available": False,
                "emergency_detected": False,
                "severity": "None",
                "confidence": 0.0,
                "detected_issue": "AI emergency detection model unavailable",
                "explanation": "No automated computer vision emergency detection model is currently active on this server. TreeGuard does not simulate or fabricate emergency findings.",
                "recommended_action": "Manual review recommended. If this is an immediate public safety hazard or life-threatening situation, contact emergency services (911) or local emergency authorities directly. Otherwise, submit a standard tree report for field crew inspection.",
                "detected_conditions": [],
                "risk_factors": [],
            }

        try:
            # Placeholder hook for when a real vision weights file / model is connected
            # Real model inference would be performed here
            raise NotImplementedError("Real AI model inference runner")
        except Exception as e:
            logger.error("Emergency AI analysis error: %s", str(e), exc_info=True)
            return {
                "analysis_status": "failed",
                "is_ai_available": True,
                "emergency_detected": False,
                "severity": "Unknown",
                "confidence": 0.0,
                "detected_issue": "AI analysis service error",
                "explanation": "An unexpected error occurred while executing the emergency vision analysis pipeline.",
                "recommended_action": "Manual review recommended. Please submit a tree report for municipal arborist review.",
                "detected_conditions": [],
                "risk_factors": [],
            }

    @classmethod
    async def analyze_and_create(
        cls,
        db: AsyncSession,
        user: User,
        image_file: UploadFile,
        report_id: Optional[str] = None,
        tree_id: Optional[str] = None,
        location_name: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> EmergencyAnalysisResponse:
        """
        Validates file, performs honest emergency analysis check, saves record to DB,
        and returns structured response.
        """
        # Validate report_id if provided
        valid_report_id = None
        if report_id and report_id.strip():
            rep_stmt = select(Report).where(Report.id == report_id.strip())
            rep_res = await db.execute(rep_stmt)
            rep = rep_res.scalars().first()
            if rep:
                valid_report_id = rep.id
                if not location_name:
                    location_name = rep.location_name
                if latitude is None:
                    latitude = rep.latitude
                if longitude is None:
                    longitude = rep.longitude

        # Validate tree_id if provided
        valid_tree_id = None
        if tree_id and tree_id.strip():
            tree_stmt = select(Tree).where(Tree.id == tree_id.strip())
            tree_res = await db.execute(tree_stmt)
            tr = tree_res.scalars().first()
            if tr:
                valid_tree_id = tr.id
                if not location_name:
                    location_name = tr.location_name
                if latitude is None:
                    latitude = tr.latitude
                if longitude is None:
                    longitude = tr.longitude

        # 1. Validate and save image file
        image_url = await cls.validate_and_save_image(image_file)

        # 2. Generate unique analysis ID
        analysis_id = await cls.generate_unique_emergency_id(db)

        # 3. Evaluate emergency
        evaluation = cls.evaluate_emergency(image_url)

        # 4. Create database model
        analysis = EmergencyAnalysis(
            id=analysis_id,
            user_id=user.id,
            report_id=valid_report_id,
            tree_id=valid_tree_id,
            image_url=image_url,
            analysis_status=evaluation["analysis_status"],
            is_ai_available=evaluation["is_ai_available"],
            emergency_detected=evaluation["emergency_detected"],
            severity=evaluation["severity"],
            confidence=evaluation["confidence"],
            detected_issue=evaluation["detected_issue"],
            explanation=evaluation["explanation"],
            recommended_action=evaluation["recommended_action"],
            detected_conditions=json.dumps(evaluation.get("detected_conditions", [])),
            risk_factors=json.dumps(evaluation.get("risk_factors", [])),
            location_name=location_name.strip() if location_name else None,
            latitude=latitude,
            longitude=longitude,
        )

        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)

        return cls._to_response(analysis)

    @classmethod
    async def get_user_analyses(cls, db: AsyncSession, user_id: str) -> List[EmergencyAnalysisResponse]:
        """
        Retrieves all emergency analyses performed by the user.
        """
        stmt = select(EmergencyAnalysis).where(EmergencyAnalysis.user_id == user_id).order_by(EmergencyAnalysis.created_at.desc())
        result = await db.execute(stmt)
        records = result.scalars().all()
        return [cls._to_response(r) for r in records]

    @classmethod
    async def get_analysis_by_id(cls, db: AsyncSession, analysis_id: str) -> Optional[EmergencyAnalysis]:
        """
        Retrieves a single emergency analysis by ID.
        """
        stmt = select(EmergencyAnalysis).where(EmergencyAnalysis.id == analysis_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @classmethod
    def _to_response(cls, model: EmergencyAnalysis) -> EmergencyAnalysisResponse:
        """
        Converts EmergencyAnalysis database model to EmergencyAnalysisResponse schema.
        """
        try:
            detected_conditions = json.loads(model.detected_conditions) if model.detected_conditions else []
        except Exception:
            detected_conditions = []

        try:
            risk_factors = json.loads(model.risk_factors) if model.risk_factors else []
        except Exception:
            risk_factors = []

        return EmergencyAnalysisResponse(
            id=model.id,
            user_id=model.user_id,
            report_id=model.report_id,
            tree_id=model.tree_id,
            image_url=model.image_url,
            analysis_status=model.analysis_status,
            is_ai_available=model.is_ai_available,
            emergency_detected=model.emergency_detected,
            severity=model.severity,
            confidence=model.confidence,
            detected_issue=model.detected_issue,
            explanation=model.explanation,
            recommended_action=model.recommended_action,
            detected_conditions=detected_conditions,
            risk_factors=risk_factors,
            location_name=model.location_name,
            latitude=model.latitude,
            longitude=model.longitude,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

emergency_service = EmergencyService()
