from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from proxima.database import get_db
from proxima.models.core import User
from proxima.middleware.auth_middleware import get_current_user
from proxima.schemas.dashboard import DashboardSummary, RecentRun, QuickStats
from proxima.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardSummary)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await DashboardService.get_overview(db, str(current_user.user_id))

@router.get("/recent", response_model=List[RecentRun])
async def get_recent_runs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await DashboardService.get_recent_runs(db, str(current_user.user_id))

@router.get("/stats", response_model=QuickStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await DashboardService.get_quick_stats(db, str(current_user.user_id))
