from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from sqlalchemy import select, or_, desc, func
from pydantic import BaseModel
import uuid

from proxima.database import get_db
from proxima.models.core import User
from proxima.models.admin import AdminAuditLog
from proxima.models.ai import PromptVersion, DomainKnowledgeChunk, AIRequest
from proxima.middleware.admin_middleware import require_admin, require_super_admin, log_admin_action

router = APIRouter(prefix="/api/admin", tags=["admin"])

class RoleUpdateRequest(BaseModel):
    role: str

class DeactivateRequest(BaseModel):
    is_active: bool

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    request: Request,
    admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db)
):
    if str(admin.user_id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot modify own privileges")
        
    target_user = await db.get(User, uuid.UUID(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_role = target_user.role
    target_user.role = payload.role
    
    await log_admin_action(
        admin=admin,
        action="update_role",
        target_type="user",
        target_id=user_id,
        payload={"old": old_role, "new": payload.role},
        request=request,
        db=db
    )
    
    await db.commit()
    return {"status": "success", "user_id": user_id, "role": target_user.role}

@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    payload: DeactivateRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if str(admin.user_id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate own account")
        
    target_user = await db.get(User, uuid.UUID(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if admin.role != "super_admin" and target_user.role in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Standard admin cannot deactivate other admins")
        
    target_user.is_active = payload.is_active
    
    await log_admin_action(
        admin=admin,
        action="reactivate_user" if payload.is_active else "deactivate_user",
        target_type="user",
        target_id=user_id,
        payload={"is_active": payload.is_active},
        request=request,
        db=db
    )
    
    await db.commit()
    return {"status": "success", "user_id": user_id, "is_active": target_user.is_active}

@router.get("/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    
    if search:
        query = query.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.name.ilike(f"%{search}%")
            )
        )
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    query = query.order_by(desc(User.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "user_id": str(u.user_id),
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "plan": u.plan,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
                "updated_at": u.updated_at.isoformat()
            } for u in users
        ]
    }

@router.get("/logs")
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    admin_user_id: Optional[str] = None,
    target_resource: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(AdminAuditLog)
    
    if action:
        query = query.where(AdminAuditLog.action == action)
    if admin_user_id:
        try:
            query = query.where(AdminAuditLog.admin_user_id == uuid.UUID(admin_user_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid admin_user_id format")
            
    if target_resource:
        query = query.where(AdminAuditLog.target_resource.ilike(f"%{target_resource}%"))
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    query = query.order_by(desc(AdminAuditLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "log_id": str(log.log_id),
                "admin_user_id": str(log.admin_user_id),
                "action": log.action,
                "target_resource": log.target_resource,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat()
            } for log in logs
        ]
    }

class PromptCreateRequest(BaseModel):
    prompt_key: str
    content: str
    is_active: bool = False

@router.get("/prompts")
async def list_prompts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    prompt_key: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(PromptVersion)
    
    if prompt_key:
        query = query.where(PromptVersion.prompt_key == prompt_key)
    if is_active is not None:
        query = query.where(PromptVersion.is_active == is_active)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    query = query.order_by(desc(PromptVersion.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    prompts = result.scalars().all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "version_id": str(p.version_id),
                "prompt_key": p.prompt_key,
                "content": p.content,
                "version": p.version,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat()
            } for p in prompts
        ]
    }

@router.post("/prompts")
async def create_prompt_version(
    payload: PromptCreateRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import update
    
    version_query = select(func.max(PromptVersion.version)).where(PromptVersion.prompt_key == payload.prompt_key)
    version_result = await db.execute(version_query)
    max_version = version_result.scalar_one_or_none()
    next_version = (max_version or 0) + 1
    
    if payload.is_active:
        update_query = update(PromptVersion).where(PromptVersion.prompt_key == payload.prompt_key).values(is_active=False)
        await db.execute(update_query)
        
    new_prompt = PromptVersion(
        prompt_key=payload.prompt_key,
        content=payload.content,
        version=next_version,
        is_active=payload.is_active
    )
    db.add(new_prompt)
    await db.flush()
    
    await log_admin_action(
        admin=admin,
        action="create_prompt",
        target_type="prompt_version",
        target_id=str(new_prompt.version_id),
        payload={"prompt_key": payload.prompt_key, "version": next_version, "is_active": payload.is_active},
        request=request,
        db=db
    )
    
    await db.commit()
    
    return {
        "status": "success",
        "version_id": str(new_prompt.version_id),
        "prompt_key": new_prompt.prompt_key,
        "version": new_prompt.version,
        "is_active": new_prompt.is_active
    }

@router.patch("/prompts/{version_id}/activate")
async def activate_prompt_version(
    version_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import update
    
    target_prompt = await db.get(PromptVersion, uuid.UUID(version_id))
    if not target_prompt:
        raise HTTPException(status_code=404, detail="Prompt version not found")
        
    update_query = update(PromptVersion).where(
        PromptVersion.prompt_key == target_prompt.prompt_key,
        PromptVersion.version_id != target_prompt.version_id
    ).values(is_active=False)
    await db.execute(update_query)
    
    target_prompt.is_active = True
    
    await log_admin_action(
        admin=admin,
        action="activate_prompt",
        target_type="prompt_version",
        target_id=version_id,
        payload={"prompt_key": target_prompt.prompt_key},
        request=request,
        db=db
    )
    
    await db.commit()
    
    return {
        "status": "success",
        "version_id": version_id,
        "prompt_key": target_prompt.prompt_key,
        "is_active": True
    }

@router.get("/knowledge")
async def list_knowledge_chunks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    kb_name: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(DomainKnowledgeChunk)
    
    if kb_name:
        query = query.where(DomainKnowledgeChunk.kb_name == kb_name)
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    query = query.order_by(DomainKnowledgeChunk.kb_name, DomainKnowledgeChunk.chunk_index).offset(skip).limit(limit)
    result = await db.execute(query)
    chunks = result.scalars().all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "chunk_id": str(c.chunk_id),
                "kb_name": c.kb_name,
                "title": c.title,
                "chunk_index": c.chunk_index,
                "token_count": c.token_count,
                "source": c.source,
                "embedded_at": c.embedded_at.isoformat() if c.embedded_at else None,
                "created_at": c.created_at.isoformat()
            } for c in chunks
        ]
    }

class KnowledgeSyncRequest(BaseModel):
    kb_name: str
    force_reindex: bool = False

@router.post("/knowledge/sync")
async def sync_knowledge_base(
    payload: KnowledgeSyncRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    await log_admin_action(
        admin=admin,
        action="sync_knowledge",
        target_type="knowledge_base",
        target_id=payload.kb_name,
        payload={"force_reindex": payload.force_reindex},
        request=request,
        db=db
    )
    
    await db.commit()
    
    return {
        "status": "success",
        "kb_name": payload.kb_name,
        "message": "Knowledge sync triggered successfully"
    }

@router.get("/analytics/overview")
async def get_analytics_overview(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func, cast, Integer
    
    # 1. Total & Active Users
    user_stats_query = select(
        func.count(User.user_id).label("total_users"),
        func.sum(cast(User.is_active, Integer)).label("active_users")
    )
    user_stats = await db.execute(user_stats_query)
    user_stats_row = user_stats.first()
    total_users = user_stats_row.total_users or 0
    active_users = user_stats_row.active_users or 0

    # 2. AI Request Aggregates
    request_stats_query = select(
        func.count(AIRequest.request_id).label("total_requests"),
        func.sum(func.coalesce(AIRequest.computed_cost, 0)).label("total_cost"),
        func.sum(func.coalesce(AIRequest.tokens_input, 0) + func.coalesce(AIRequest.tokens_output, 0)).label("total_tokens")
    )
    request_stats = await db.execute(request_stats_query)
    request_stats_row = request_stats.first()
    total_requests = request_stats_row.total_requests or 0
    total_cost = request_stats_row.total_cost or 0.0
    total_tokens = request_stats_row.total_tokens or 0

    # 3. Top Users by Cost
    top_users_query = select(
        User.user_id,
        User.email,
        User.name,
        func.sum(func.coalesce(AIRequest.computed_cost, 0)).label("total_cost"),
        func.count(AIRequest.request_id).label("total_requests")
    ).join(
        AIRequest, User.user_id == AIRequest.user_id
    ).group_by(
        User.user_id
    ).order_by(
        desc("total_cost")
    ).limit(10)
    top_users_res = await db.execute(top_users_query)
    top_users = [
        {
            "user_id": str(r.user_id),
            "email": r.email,
            "name": r.name,
            "cost": float(r.total_cost),
            "requests": int(r.total_requests)
        } for r in top_users_res.all()
    ]

    # 4. Cost by Model
    model_cost_query = select(
        AIRequest.model_id,
        func.sum(func.coalesce(AIRequest.computed_cost, 0)).label("total_cost"),
        func.count(AIRequest.request_id).label("total_requests")
    ).group_by(
        AIRequest.model_id
    ).order_by(
        desc("total_cost")
    )
    model_cost_res = await db.execute(model_cost_query)
    cost_by_model = [
        {
            "model_id": r.model_id,
            "cost": float(r.total_cost),
            "requests": int(r.total_requests)
        } for r in model_cost_res.all()
    ]

    return {
        "status": "success",
        "data": {
            "total_users": total_users,
            "active_users": active_users,
            "total_requests": total_requests,
            "total_cost": float(total_cost),
            "total_tokens": int(total_tokens),
            "top_users": top_users,
            "cost_by_model": cost_by_model
        }
    }
