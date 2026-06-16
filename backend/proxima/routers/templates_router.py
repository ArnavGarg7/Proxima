from fastapi import APIRouter

router = APIRouter(prefix="/api/templates", tags=["templates"])

@router.get("/")
async def list_templates():
    return {"status": "stub"}
