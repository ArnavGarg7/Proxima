from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

@router.post("/complete")
async def intelligence_complete():
    return StreamingResponse(iter(["stub stream"]), media_type="text/event-stream")

@router.post("/scan")
async def intelligence_scan():
    return {"code": 0.33, "medical": 0.33, "legal": 0.34}

@router.post("/confidence")
async def intelligence_confidence():
    return {"scores": []}

@router.post("/compare")
async def intelligence_compare():
    return {"message": "Stage 2"}
