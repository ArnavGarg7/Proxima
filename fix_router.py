import sys

file_path = "backend/proxima/routers/intelligence_router.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add AnalyzeDocumentRequest class
insert_analyze_request = """class AnalyzeDocumentRequest(BaseModel):
    document_id: str
    template_origin: Optional[str] = None
"""

if "class AnalyzeDocumentRequest" not in content:
    content = content.replace(
        "class IntelligenceCompletionRequest(BaseModel):",
        insert_analyze_request + "\nclass IntelligenceCompletionRequest(BaseModel):"
    )

# Revert /complete to streaming, and rename existing /complete logic to /analyze
# The existing /complete starts at `@router.post("/complete")` and ends before `@router.post("/scan")`
# I'll use regex or string split to locate it.

import re

pattern = re.compile(r'@router\.post\("/complete"\)\nasync def intelligence_complete\((.*?)\n@router\.post\("/scan"\)', re.DOTALL)
match = pattern.search(content)

if match:
    old_complete_block = match.group(1) # The body of the current /complete
    
    # Change it to /analyze and rename the function to intelligence_analyze
    # Also change `payload: IntelligenceCompletionRequest` to `payload: AnalyzeDocumentRequest`
    # Wait, the body uses `actual_task = payload.user_task`. For /analyze, we don't have user_task!
    
    new_analyze_block = """@router.post("/analyze")
async def intelligence_analyze(
    request: Request,
    payload: AnalyzeDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 0. Tenant Authorization Check
    doc = await db.get(Document, uuid.UUID(payload.document_id))
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    # Check explicitly for processing failures
    if doc.status == "no_extractable_text":
        raise HTTPException(status_code=422, detail="Document contains no extractable text")
    elif doc.status == "failed":
        raise HTTPException(status_code=422, detail="Document parsing failed")
    elif doc.status == "processing":
        raise HTTPException(status_code=422, detail="Document is still processing")

    # Reconstruct text
    result = await db.execute(select(DocumentChunk).where(DocumentChunk.document_id == doc.document_id).order_by(DocumentChunk.chunk_index))
    chunks = result.scalars().all()
    
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no extractable text.")
        
    full_text = "\\n\\n".join([chunk.content for chunk in chunks])
    
    metadata = {
        "title": doc.title
    }
    
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "analyze", doc.document_id, payload.template_origin)
    
    try:
        analysis_result = await GeneralDocumentAnalyzer.analyze(db, full_text, metadata)
        await complete_analysis_session(db, session, status="completed", start_time=start_time, confidence=analysis_result.get("confidence", 0))
        return analysis_result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e
"""

    streaming_complete_block = """@router.post("/complete")
async def intelligence_complete(
    request: Request,
    payload: IntelligenceCompletionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 0. Tenant Authorization Check
    doc = await db.get(Document, uuid.UUID(payload.document_id))
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    # Check explicitly for processing failures
    if doc.status == "no_extractable_text":
        async def empty_stream_no_text():
            import json
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Extraction failed: Document contains no extractable text. Scanned PDFs or empty files are not supported.'})}\\n\\n"
            yield "data: [DONE]\\n\\n"
        return StreamingResponse(empty_stream_no_text(), media_type="text/event-stream")
    elif doc.status == "failed":
        async def empty_stream_failed():
            import json
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Extraction failed due to an unsupported format or corrupted file.'})}\\n\\n"
            yield "data: [DONE]\\n\\n"
        return StreamingResponse(empty_stream_failed(), media_type="text/event-stream")
    elif doc.status == "processing":
        async def empty_stream_processing():
            import json
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Document is still processing. Please wait a moment and try again.'})}\\n\\n"
            yield "data: [DONE]\\n\\n"
        return StreamingResponse(empty_stream_processing(), media_type="text/event-stream")

    # Clean up user task if it's just the default UI hydration string
    actual_task = payload.user_task
    if actual_task.startswith("[File Uploaded:") or actual_task.startswith("[Hydrated Document:"):
        actual_task = "Analyze this document completely and provide a comprehensive summary."

    # 1. Retrieval
    import logging
    logger = logging.getLogger("proxima.intelligence")
    logger.info(f"Workspace Analysis: Scoping to active document {doc.title} ({doc.document_id})")

    fts = FTSRetrievalService(db)
    results = await fts.search(actual_task, document_id=str(payload.document_id), limit=5)
    
    if not results:
        from sqlalchemy import text
        fallback_query = text("SELECT chunk_id, document_id, chunk_index, content, 1.0 as rank FROM document_chunks WHERE document_id = :doc_id ORDER BY chunk_index LIMIT 5")
        fallback_result = await db.execute(fallback_query, {"doc_id": str(payload.document_id)})
        rows = fallback_result.fetchall()
        if not rows:
             async def empty_stream():
                 import json
                 yield f"data: {json.dumps({'type': 'error', 'detail': 'Document has no extractable text or chunks.'})}\\n\\n"
                 yield "data: [DONE]\\n\\n"
             return StreamingResponse(empty_stream(), media_type="text/event-stream")
        results = [{"chunk_id": str(r.chunk_id), "document_id": str(r.document_id), "chunk_index": r.chunk_index, "content": r.content, "rank": float(r.rank)} for r in rows]

    logger.info(f"Retrieved {len(results)} chunks scoped exclusively to document {payload.document_id}")

    # 2. Context Builder
    context_package = fts.build_context_package(results)

    # 3. Domain Detection
    detector = DomainDetectorService()
    scores = await detector.detect_domain(context_package)
    top_domain = max(scores, key=scores.get)

    # 4. Prompt Assembler
    registry = PromptRegistryService(db)
    assembler = PromptAssemblerService(registry)
    final_prompt = await assembler.assemble_prompt(f"system_{top_domain}", context_package, actual_task)

    # 5. Model Registry
    model = await model_registry.get_default_generation(db)
    
    # 6. Gemini Provider & SSE Stream
    qhe = QualityHeuristicEngine()

    async def stream_generator():
        ai_response_accumulator = ""
        try:
            async for chunk in model_registry.stream_completion(
                model=model,
                system_prompt=final_prompt,
                user_message=actual_task,
                temperature=payload.temperature,
                max_tokens=payload.max_tokens
            ):
                if await request.is_disconnected():
                    break
                    
                ai_response_accumulator += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\\n\\n"
            
            # 7. QHE Execution after completion
            if ai_response_accumulator:
                eval_result = qhe.evaluate_response(final_prompt, ai_response_accumulator, top_domain)
                yield f"data: {json.dumps({'type': 'qhe', 'eval': eval_result})}\\n\\n"
                
            yield "data: [DONE]\\n\\n"
            
        except HTTPException as he:
            yield f"data: {json.dumps({'type': 'error', 'detail': he.detail})}\\n\\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Provider timeout.'})}\\n\\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\\n\\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
"""

    # We replace the entire matched block
    # `match.group(0)` is `@router.post("/complete")\nasync def intelligence_complete(...)\n@router.post("/scan")`
    new_content = content.replace(
        match.group(0), 
        streaming_complete_block + "\n" + new_analyze_block + "\n@router.post(\"/scan\")"
    )
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    print("Successfully patched.")
else:
    print("Could not find block to patch.")
