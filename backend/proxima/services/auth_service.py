from proxima.config import settings
from jose import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

def create_access_token(user_id: str, email: str, plan: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "plan": plan,
        "role": role,
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_private_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt

def create_refresh_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_private_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(
        token, 
        settings.jwt_public_key, 
        algorithms=[settings.jwt_algorithm]
    )

def get_cookie_settings() -> dict:
    """Returns environment-aware cookie settings based on Readiness Report."""
    return {
        "httponly": True,
        "secure": settings.is_production,
        "samesite": "strict" if settings.is_production else "lax"
    }
