from fastapi import APIRouter

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/me")
async def get_me():
    return {"status": "ok"}
