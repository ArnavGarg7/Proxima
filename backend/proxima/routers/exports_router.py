from fastapi import APIRouter

router = APIRouter(prefix="/api/exports", tags=["exports"])

@router.get("/")
async def list_exports():
    return {"status": "stub"}
