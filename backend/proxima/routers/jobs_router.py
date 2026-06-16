from fastapi import APIRouter

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/")
async def list_jobs():
    return {"status": "stub"}
