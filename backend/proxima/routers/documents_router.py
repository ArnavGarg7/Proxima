from fastapi import APIRouter

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("/")
async def list_documents():
    return {"status": "stub"}
