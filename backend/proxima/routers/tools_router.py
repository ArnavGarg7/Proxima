from fastapi import APIRouter

router = APIRouter(prefix="/api/tools", tags=["tools"])

@router.get("/")
async def list_tools():
    return {"status": "stub"}
