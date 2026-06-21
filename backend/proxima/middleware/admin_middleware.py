from fastapi import Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.models.core import User
from proxima.models.admin import AdminAuditLog
from proxima.middleware.auth_middleware import get_current_user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency for all /admin/api/* endpoints."""
    if current_user.role not in ('admin', 'super_admin'):
        raise HTTPException(403, "Admin access required")
    return current_user

async def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only super_admin can change roles."""
    if current_user.role != 'super_admin':
        raise HTTPException(403, "Super admin access required for role changes")
    return current_user

async def log_admin_action(
    admin: User, action: str,
    target_type: str | None, target_id: str | None,
    payload: dict | None, request: Request, db: AsyncSession
) -> None:
    """Must be called BEFORE response is returned."""
    entry = AdminAuditLog(
        admin_user_id=admin.user_id,
        action=action,
        target_resource=f"{target_type}:{target_id}" if target_type and target_id else (target_type or None),
        details=payload,
        ip_address=request.client.host if request.client else None
    )
    db.add(entry)
    # The caller will commit
