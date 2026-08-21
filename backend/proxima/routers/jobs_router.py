import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from proxima.database import get_db
from proxima.models.core import BackgroundJob, User
from proxima.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _serialize(job: BackgroundJob) -> dict:
    return {
        "job_id": str(job.job_id),
        "job_type": job.job_type,
        "status": job.status,
        "result": job.result,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("/")
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's background jobs, newest first."""
    stmt = (
        select(BackgroundJob)
        .where(BackgroundJob.user_id == current_user.user_id)
        .order_by(desc(BackgroundJob.created_at))
    )
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    return [_serialize(job) for job in jobs]


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single job. Jobs are strictly user-scoped."""
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    job = await db.get(BackgroundJob, job_uuid)
    # 404 (not 403) for another user's job so job existence is not disclosed.
    if not job or job.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Job not found")

    return _serialize(job)
