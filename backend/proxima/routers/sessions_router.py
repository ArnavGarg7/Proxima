from fastapi import APIRouter

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("/")
async def list_sessions():
    return {"status": "stub"}
