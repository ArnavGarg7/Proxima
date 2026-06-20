from pydantic import BaseModel
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from proxima.database import get_db
import json

from proxima.services.domain_detector import DomainDetectorService
from proxima.services.retrieval_fts import FTSRetrievalService
from proxima.services.prompt_registry import PromptRegistryService
from proxima.services.prompt_assembler import PromptAssemblerService
from proxima.services.model_registry import model_registry
from proxima.services.qhe import QualityHeuristicEngine

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

class IntelligenceCompletionRequest(BaseModel):
    document_id: str
    user_task: str
    max_tokens: int = 1000
    temperature: float = 0.7

@router.post("/complete")
async def intelligence_complete(
    request: Request,
    payload: IntelligenceCompletionRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Retrieval
    fts = FTSRetrievalService(db)
    results = await fts.search(payload.user_task, document_id=payload.document_id, limit=5)
    
    if not results:
        raise HTTPException(status_code=404, detail="Empty retrieval context. No matching chunks found.")

    # 2. Context Builder
    context_package = fts.build_context_package(results)

    # 3. Domain Detection
    detector = DomainDetectorService()
    scores = await detector.detect_domain(context_package)
    top_domain = max(scores, key=scores.get)

    # 4. Prompt Assembler
    registry = PromptRegistryService(db)
    assembler = PromptAssemblerService(registry)
    final_prompt = await assembler.assemble_prompt(f"system_{top_domain}", context_package, payload.user_task)

    # 5. Model Registry
    # Using 'generation' default for Milestone 5 since it's the required path.
    # The ModelRegistry returns the appropriate RegisteredModel.
    model = await model_registry.get_default_generation(db)
    
    # 6. Gemini Provider & SSE Stream
    qhe = QualityHeuristicEngine()

    async def stream_generator():
        ai_response_accumulator = ""
        try:
            # We are calling ModelRegistry's stream_completion
            async for chunk in model_registry.stream_completion(
                model=model,
                system_prompt=final_prompt,
                user_message=payload.user_task, # The context is in system prompt
                temperature=payload.temperature,
                max_tokens=payload.max_tokens
            ):
                if await request.is_disconnected():
                    # Cancellation support
                    break
                    
                ai_response_accumulator += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # 7. QHE Execution after completion
            if ai_response_accumulator:
                eval_result = qhe.evaluate_response(final_prompt, ai_response_accumulator, top_domain)
                yield f"data: {json.dumps({'type': 'qhe', 'eval': eval_result})}\n\n"
                
            yield "data: [DONE]\n\n"
            
        except HTTPException as he:
            yield f"data: {json.dumps({'type': 'error', 'detail': he.detail})}\n\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Provider timeout.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@router.post("/scan")
async def intelligence_scan():
    return {"code": 0.33, "medical": 0.33, "legal": 0.34}

@router.post("/confidence")
async def intelligence_confidence():
    return {"scores": []}

@router.post("/compare")
async def intelligence_compare():
    return {"message": "Stage 2"}
