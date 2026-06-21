from fastapi import APIRouter, Depends
from proxima.middleware.auth_middleware import get_current_user
from proxima.models.core import User

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return {
        "id": str(current_user.user_id),
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "plan": current_user.plan,
        "is_active": current_user.is_active,
        "tokens_used": current_user.tokens_used,
        "tokens_limit": current_user.tokens_limit,
        "created_at": current_user.created_at.isoformat(),
    }
