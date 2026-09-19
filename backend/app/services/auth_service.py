import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.config import settings
from app.models.user import User
from app.models.token import PasswordResetToken
from app.schemas.auth import RegisterRequest
from app.services.email_service import email_service

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        # Generate salt and hash password with bcrypt
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8")
            )
        except Exception:
            return False

    @staticmethod
    def hash_reset_token(token: str) -> str:
        # Cryptographic SHA256 hash to avoid storing plain reset tokens in DB
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def create_access_token(user: User, remember_me: bool = False) -> str:
        if remember_me:
            expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        else:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        expire = datetime.now(timezone.utc) + expires_delta
        payload = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access",
            "remember_me": remember_me,
        }
        encoded_jwt = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def decode_access_token(token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        normalized_email = email.strip().lower()
        stmt = select(User).where(User.email == normalized_email)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @classmethod
    async def register_user(cls, db: AsyncSession, data: RegisterRequest) -> User:
        # Check if email is already taken
        existing_user = await cls.get_user_by_email(db, data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists."
            )

        # Hash password securely
        password_hash = cls.hash_password(data.password)

        new_user = User(
            full_name=data.full_name.strip(),
            email=data.email.strip().lower(),
            password_hash=password_hash,
            role=data.role,
            is_active=True,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @classmethod
    async def authenticate_user(cls, db: AsyncSession, email: str, password: str) -> User:
        user = await cls.get_user_by_email(db, email)
        
        # Generic error message to prevent user enumeration
        generic_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

        if not user:
            # Perform dummy bcrypt check to mitigate timing attacks
            cls.verify_password("dummy_password", "$2b$12$e8ul2i0zX5Zz7FmXQnOq7.73G6hV1P0L1hR1U4eW0Q6J8yT4o.Gey")
            raise generic_error

        if not cls.verify_password(password, user.password_hash):
            raise generic_error

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated. Please contact support."
            )

        return user

    @classmethod
    async def forgot_password(cls, db: AsyncSession, email: str) -> None:
        user = await cls.get_user_by_email(db, email)
        if not user:
            # Do not reveal whether an email exists
            return

        # Generate cryptographically secure random token
        raw_token = secrets.token_urlsafe(32)
        token_hash = cls.hash_reset_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        reset_token_entry = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False,
        )

        db.add(reset_token_entry)
        await db.commit()

        # Send reset email
        email_service.send_password_reset_email(user.email, raw_token)

    @classmethod
    async def reset_password(cls, db: AsyncSession, raw_token: str, new_password: str) -> None:
        token_hash = cls.hash_reset_token(raw_token.strip())
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == False,
        )
        result = await db.execute(stmt)
        token_entry = result.scalars().first()

        now = datetime.now(timezone.utc)
        if not token_entry or token_entry.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your reset link is invalid or has expired."
            )

        # Get user
        user = await cls.get_user_by_id(db, token_entry.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account not found."
            )

        # Update password hash
        user.password_hash = cls.hash_password(new_password)
        token_entry.used = True

        await db.commit()

    @classmethod
    def get_user_profile(cls, user: User):
        """
        Formats user record into UserProfileResponse.
        """
        import json
        from app.schemas.auth import UserProfileResponse

        notif_prefs = None
        if user.notification_preferences:
            try:
                notif_prefs = json.loads(user.notification_preferences) if isinstance(user.notification_preferences, str) else user.notification_preferences
            except Exception:
                notif_prefs = None

        privacy_prefs = None
        if user.privacy_settings:
            try:
                privacy_prefs = json.loads(user.privacy_settings) if isinstance(user.privacy_settings, str) else user.privacy_settings
            except Exception:
                privacy_prefs = None

        member_since = user.created_at.strftime("%B %Y") if user.created_at else "March 2024"

        return UserProfileResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            phone_number=user.phone_number,
            primary_district=user.primary_district or "RS Puram, Coimbatore",
            avatar_url=user.avatar_url,
            notification_preferences=notif_prefs,
            privacy_settings=privacy_prefs,
            member_since=member_since,
            is_active=user.is_active,
            created_at=user.created_at,
        )

    @classmethod
    async def update_user_profile(cls, db: AsyncSession, user: User, data):
        """
        Updates allowed profile fields and preferences in PostgreSQL.
        """
        import json
        if data.full_name is not None:
            user.full_name = data.full_name.strip()
        if data.phone_number is not None:
            user.phone_number = data.phone_number.strip()
        if data.primary_district is not None:
            user.primary_district = data.primary_district.strip()
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url.strip()
        if data.notification_preferences is not None:
            user.notification_preferences = json.dumps(data.notification_preferences)
        if data.privacy_settings is not None:
            user.privacy_settings = json.dumps(data.privacy_settings)

        user.updated_at = datetime.now(timezone.utc)
        db.add(user)
        await db.commit()
        await db.refresh(user)

        return cls.get_user_profile(user)

    @classmethod
    async def change_user_password(cls, db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
        """
        Validates current password and updates with securely hashed new password.
        """
        if not cls.verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )

        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long."
            )

        user.password_hash = cls.hash_password(new_password)
        user.updated_at = datetime.now(timezone.utc)
        db.add(user)
        await db.commit()

auth_service = AuthService()
