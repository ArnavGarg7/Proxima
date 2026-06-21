from proxima.config import settings
from proxima.models.core import User
from jose import jwt, JWTError, ExpiredSignatureError
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

logger = structlog.get_logger()


def create_access_token(user_id: str, email: str, plan: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "plan": plan,
        "role": role,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(to_encode, settings.jwt_private_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.jwt_private_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify any token. Raises JWTError on invalid or expired."""
    return jwt.decode(token, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Decode and verify a refresh token specifically. Raises ValueError on wrong type."""
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise ValueError("Not a refresh token")
    return payload


def get_cookie_settings() -> dict:
    """Returns environment-aware cookie settings."""
    return {
        "httponly": True,
        "secure": settings.is_production,
        "samesite": "strict" if settings.is_production else "lax",
        "path": "/",
    }


async def find_or_create_user(
    db: AsyncSession,
    google_id: str,
    email: str,
    name: str,
) -> User:
    """
    Find-or-create strategy:
    1. Look up by google_id (primary key for OAuth identity)
    2. Fall back to email lookup (covers pre-existing records without google_id)
    3. Create new user if none found

    Policy:
    - Existing user: update last_login_at, update name, preserve role and plan
    - New user: role=user, plan=free, is_active=True
    """
    now = datetime.now(timezone.utc)

    # 1. Try google_id lookup
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        # Update login metadata, preserve role/plan
        user.last_login_at = now
        user.name = name  # Sync name in case it changed in Google
        await db.commit()
        await db.refresh(user)
        logger.info("auth.user_found_by_google_id", user_id=str(user.user_id))
        return user

    # 2. Fall back to email lookup (handles users created before google_id was added)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        # Attach google_id and update metadata
        user.google_id = google_id
        user.last_login_at = now
        user.name = name
        await db.commit()
        await db.refresh(user)
        logger.info("auth.user_found_by_email_linked", user_id=str(user.user_id))
        return user

    # 3. Create new user
    user = User(
        google_id=google_id,
        email=email,
        name=name,
        role="user",
        plan="free",
        is_active=True,
        last_login_at=now,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("auth.user_created", user_id=str(user.user_id), email=email)
    return user
