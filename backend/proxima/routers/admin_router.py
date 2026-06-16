from fastapi import APIRouter

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/")
async def list_admin():
    return {"status": "stub"}
