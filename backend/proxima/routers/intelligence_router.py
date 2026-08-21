from pydantic import BaseModel
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from proxima.database import get_db
from proxima.models.core import User, Document, DocumentChunk, BackgroundJob
from proxima.models.ai import RegisteredModel
from proxima.services.execution.auditor import AIAuditor
from proxima.middleware.auth_middleware import get_current_user
import uuid
import json
import difflib
import re
import time
from datetime import datetime, timezone
from proxima.models.session import AnalysisSession

from proxima.services.domain_detector import DomainDetectorService
from proxima.services.retrieval_fts import FTSRetrievalService
from proxima.services.prompt_registry import PromptRegistryService
from proxima.services.prompt_assembler import PromptAssemblerService
from proxima.services.model_registry import model_registry
from proxima.services.qhe import QualityHeuristicEngine
from proxima.services.compare_analyzer import CompareAnalyzer
from proxima.services.code_suite_service import CodeSuiteService
from proxima.services.general_document_analyzer import GeneralDocumentAnalyzer
from proxima.services.execution.engine import ProximaAIEngine, AIExecutionRequest

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

class ConfidenceAuditRequest(BaseModel):
    document_id: str
    template_origin: Optional[str] = None

class DocumentCompareRequest(BaseModel):
    source_document_id: str
    target_document_id: str
    template_origin: Optional[str] = None

class AnalyzeDocumentRequest(BaseModel):
    document_id: str
    template_origin: Optional[str] = None

class IntelligenceCompletionRequest(BaseModel):
    # Backward compatible: a single document_id keeps the exact previous behavior.
    document_id: Optional[str] = None
    # Stage 7D — library-scoped cross-document intelligence (all optional):
    document_ids: Optional[List[str]] = None
    project_id: Optional[str] = None
    scope: Optional[str] = None  # "document" | "project" | "library"
    user_task: str
    max_tokens: int = 1000
    temperature: float = 0.7
    template_origin: Optional[str] = None

class CodeSuiteRequest(BaseModel):
    snippet: str
    operation: str
    language: Optional[str] = None
    template_origin: Optional[str] = None

class DomainRadarRequest(BaseModel):
    document_id: str
    template_origin: Optional[str] = None

async def create_analysis_session(db: AsyncSession, user_id: uuid.UUID, analyzer: str, document_id: uuid.UUID = None, template_origin: str = None) -> AnalysisSession:
    session = AnalysisSession(
        user_id=user_id,
        document_id=document_id,
        analyzer=analyzer,
        template_origin=template_origin,
        status="processing",
        started_at=datetime.now(timezone.utc),
        last_opened=datetime.now(timezone.utc)
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

async def complete_analysis_session(db: AsyncSession, session: AnalysisSession, status: str = "completed", confidence: int = None, start_time: float = None):
    session.status = status
    if confidence is not None:
        session.confidence = confidence
    if start_time is not None:
        session.duration_ms = int((time.time() - start_time) * 1000)
    session.last_opened = datetime.now(timezone.utc)
    await db.commit()

def _sse_error_response(detail: str) -> StreamingResponse:
    async def gen():
        yield f"data: {json.dumps({'type': 'error', 'detail': detail})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")


async def _resolve_intelligence_scope(db: AsyncSession, user: User, payload: "IntelligenceCompletionRequest"):
    """
    Resolve the authorized retrieval scope server-side (Stage 7D).

    Returns (mode, doc_ids, single_doc): mode is "single" (backward-compatible
    single document) or "multi". Ownership is ALWAYS enforced from user.user_id;
    client-supplied ids/project only narrow the owned set.
    """
    def _uuid(val: str):
        try:
            return uuid.UUID(val)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ID format")

    # Whole-library scope
    if (payload.scope or "").lower() == "library":
        res = await db.execute(
            select(Document).where(Document.user_id == user.user_id, Document.status == "processed")
        )
        return "multi", [d.document_id for d in res.scalars().all()], None

    # Project/library scope via existing documents.project_id
    if payload.project_id:
        pid = _uuid(payload.project_id)
        res = await db.execute(
            select(Document).where(
                Document.user_id == user.user_id,
                Document.project_id == pid,
                Document.status == "processed",
            )
        )
        return "multi", [d.document_id for d in res.scalars().all()], None

    # Explicit multi-document scope
    if payload.document_ids:
        ids = [_uuid(x) for x in payload.document_ids]
        res = await db.execute(
            select(Document).where(
                Document.user_id == user.user_id,
                Document.document_id.in_(ids),
                Document.status == "processed",
            )
        )
        return "multi", [d.document_id for d in res.scalars().all()], None

    # Backward-compatible single document
    if payload.document_id:
        did = _uuid(payload.document_id)
        doc = await db.get(Document, did)
        if not doc or doc.user_id != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this document")
        return "single", [doc.document_id], doc

    raise HTTPException(status_code=400, detail="A document_id, document_ids, project_id, or scope is required")


async def _persist_stream_telemetry(
    db, user_id, document_id, model_id, task_class,
    prompt, response, grounding_result, citations, latency_ms, success,
):
    """One AIRequest (token/cost) + one ResponseGrounding per stream. No content stored."""
    model = await db.get(RegisteredModel, model_id) if model_id else None
    request_id = None
    if model is not None:
        request_id = await AIAuditor.log_request(
            db, user_id, document_id, model, task_class, prompt, response
        )
    await AIAuditor.log_grounding(
        db, user_id, request_id, document_id, model_id, task_class,
        grounding_result or {}, citations or [], latency_ms, success,
    )


@router.post("/complete")
async def intelligence_complete(
    request: Request,
    payload: IntelligenceCompletionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    import logging
    logger = logging.getLogger("proxima.intelligence")

    # 0. Resolve authorized scope server-side (tenant isolation enforced here).
    mode, doc_ids, single_doc = await _resolve_intelligence_scope(db, current_user, payload)

    if mode == "single":
        doc = single_doc
        if doc.status == "no_extractable_text":
            return _sse_error_response("Extraction failed: Document contains no extractable text. Scanned PDFs or empty files are not supported.")
        elif doc.status == "failed":
            return _sse_error_response("Extraction failed due to an unsupported format or corrupted file.")
        elif doc.status == "processing":
            return _sse_error_response("Document is still processing. Please wait a moment and try again.")
        primary_document_id = doc.document_id
        search_kwargs = dict(document_ids=[doc.document_id], limit=5)
    else:
        if not doc_ids:
            return _sse_error_response("No processed documents found in the requested scope.")
        primary_document_id = None
        # Bounded candidate pool + per-document cap so no single document dominates.
        search_kwargs = dict(document_ids=doc_ids, limit=8, per_document_cap=3, candidate_pool=50)

    # Clean up user task if it's just the default UI hydration string
    actual_task = payload.user_task
    if actual_task.startswith("[File Uploaded:") or actual_task.startswith("[Hydrated Document:"):
        actual_task = "Analyze this document completely and provide a comprehensive summary."

    from proxima.services.retrieval_hybrid import HybridRetrievalService
    from proxima.services.grounding import GroundingService

    retrieval = HybridRetrievalService(db)
    results = await retrieval.search(actual_task, user_id=current_user.user_id, **search_kwargs)

    if not results:
        return _sse_error_response("No relevant content was found in the selected documents.")

    logger.info(f"Retrieved {len(results)} chunks across {len(doc_ids)} document(s) [mode={mode}]")

    # 2. Context Builder & Authoritative Registry (cross-document provenance)
    grounding_svc = GroundingService()
    context_package, registry = grounding_svc.build_context_package(results)

    # 3. Domain Detection
    detector = DomainDetectorService()
    scores = await detector.detect_domain(context_package)
    top_domain = max(scores, key=scores.get)

    # 4. Prompt Assembler
    registry_svc = PromptRegistryService(db)
    assembler = PromptAssemblerService(registry_svc)
    final_prompt = await assembler.assemble_prompt(f"system_{top_domain}", context_package, actual_task)

    # 5. AI Execution Request
    engine_request = AIExecutionRequest(
        task_class="general_chat",
        domain=top_domain,
        system_prompt=final_prompt,
        user_message=actual_task,
        user_id=current_user.user_id,
        document_id=primary_document_id,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens
    )

    # 6. Gemini Provider & SSE Stream
    qhe = QualityHeuristicEngine()

    async def stream_generator():
        ai_response_accumulator = ""
        model_id_used = None
        grounding_result = None
        citations = []
        success = False
        audited = False
        start_ts = time.time()
        try:
            execution_result = await ProximaAIEngine.execute(db, engine_request, stream=True)
            model_id_used = execution_result.model_id
            async for chunk in execution_result.content_stream:
                if await request.is_disconnected():
                    break

                ai_response_accumulator += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # 7. QHE & Grounding execution after completion
            if ai_response_accumulator:
                eval_result = qhe.evaluate_response(final_prompt, ai_response_accumulator, top_domain)
                yield f"data: {json.dumps({'type': 'qhe', 'eval': eval_result})}\n\n"

                # Grounding & Citations (authoritative registry; LLM is never the authority)
                cleaned_text, citations, invalid_refs = grounding_svc.process_citations(ai_response_accumulator, registry)
                grounding_result = grounding_svc.evaluate_grounding(cleaned_text, registry, citations, invalid_refs)
                yield f"data: {json.dumps({'type': 'grounding', 'eval': grounding_result, 'citations': citations, 'text': cleaned_text})}\n\n"

            success = True
            yield "data: [DONE]\n\n"

        except HTTPException as he:
            yield f"data: {json.dumps({'type': 'error', 'detail': he.detail})}\n\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'detail': 'Provider timeout.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
        finally:
            # WS-3: exactly one telemetry record per stream. Never break the stream.
            if not audited:
                audited = True
                try:
                    await _persist_stream_telemetry(
                        db, current_user.user_id, primary_document_id, model_id_used,
                        engine_request.task_class, final_prompt, ai_response_accumulator,
                        grounding_result, citations, int((time.time() - start_ts) * 1000), success,
                    )
                except Exception as tel_err:
                    logger.error(f"stream telemetry persistence failed: {tel_err}")

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@router.post("/analyze")
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
        
    full_text = "\n\n".join([chunk.content for chunk in chunks])
    
    metadata = {
        "title": doc.title,
        "document_id": doc.document_id,
        "user_id": current_user.user_id
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

@router.post("/analyze/async")
async def intelligence_analyze_async(
    payload: AnalyzeDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Durable general analysis (Stage 7D). Creates a BackgroundJob and dispatches a
    Celery task (map-reduce for large documents); results are surfaced via the
    existing jobs API (GET /api/jobs/{job_id}). The synchronous /analyze endpoint
    is unchanged for backward compatibility.
    """
    try:
        doc_uuid = uuid.UUID(payload.document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    doc = await db.get(Document, doc_uuid)
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
    if doc.status == "processing":
        raise HTTPException(status_code=422, detail="Document is still processing")
    elif doc.status == "failed":
        raise HTTPException(status_code=422, detail="Document parsing failed")
    elif doc.status == "no_extractable_text":
        raise HTTPException(status_code=422, detail="Document contains no extractable text")

    job = BackgroundJob(
        job_id=uuid.uuid4(),
        user_id=current_user.user_id,
        job_type="analysis",
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    from proxima.tasks import run_document_analysis
    run_document_analysis.delay(str(job.job_id), str(doc.document_id))

    return {
        "job_id": str(job.job_id),
        "document_id": str(doc.document_id),
        "analyzer": "general",
        "status": "pending",
    }


@router.post("/scan")
async def intelligence_scan():
    return {"code": 0.33, "medical": 0.33, "legal": 0.34}

@router.post("/confidence")
async def intelligence_confidence(
    payload: ConfidenceAuditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.confidence_analyzer import ConfidenceAnalyzer

    try:
        doc_uuid = uuid.UUID(payload.document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    doc = await db.get(Document, doc_uuid)
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    if doc.status == "processing":
        raise HTTPException(status_code=422, detail="Document is still processing")
    elif doc.status == "failed":
        raise HTTPException(status_code=422, detail="Document parsing failed")
    elif doc.status == "no_extractable_text":
        raise HTTPException(status_code=422, detail="Document contains no extractable text")
        
    chunks_query = select(DocumentChunk).where(DocumentChunk.document_id == doc_uuid).order_by(DocumentChunk.chunk_index)
    chunks_result = await db.execute(chunks_query)
    chunks = chunks_result.scalars().all()
    
    if not chunks:
        raise HTTPException(status_code=422, detail="Document has no content")
        
    # Reconstruct document text
    # Join with newlines to preserve structural clues like paragraphs and headings better than just spaces.
    full_text = "\n\n".join(c.content for c in chunks)
    
    metadata = {
        "document_id": str(doc.document_id),
        "document_title": doc.title
    }
    
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "audit", doc.document_id, payload.template_origin)
    
    try:
        result = ConfidenceAnalyzer.analyze(full_text, metadata)
        confidence_score = result.get("overall_score", None)
        await complete_analysis_session(db, session, status="completed", confidence=confidence_score, start_time=start_time)
        return result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

@router.post("/compare")
async def intelligence_compare(
    payload: DocumentCompareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        source_uuid = uuid.UUID(payload.source_document_id)
        target_uuid = uuid.UUID(payload.target_document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
        
    source_doc = await db.get(Document, source_uuid)
    if not source_doc or source_doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access source document")
    if source_doc.status == "processing":
        raise HTTPException(status_code=422, detail="Source document is still processing")
    elif source_doc.status == "failed":
        raise HTTPException(status_code=422, detail="Source document parsing failed")
    elif source_doc.status == "no_extractable_text":
        raise HTTPException(status_code=422, detail="Source document contains no extractable text")
        
    target_doc = await db.get(Document, target_uuid)
    if not target_doc or target_doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access target document")
    if target_doc.status == "processing":
        raise HTTPException(status_code=422, detail="Target document is still processing")
    elif target_doc.status == "failed":
        raise HTTPException(status_code=422, detail="Target document parsing failed")
    elif target_doc.status == "no_extractable_text":
        raise HTTPException(status_code=422, detail="Target document contains no extractable text")
        
    source_chunks_query = select(DocumentChunk).where(DocumentChunk.document_id == source_uuid).order_by(DocumentChunk.chunk_index)
    source_chunks_result = await db.execute(source_chunks_query)
    source_text = "\n\n".join(c.content for c in source_chunks_result.scalars().all())
    
    target_chunks_query = select(DocumentChunk).where(DocumentChunk.document_id == target_uuid).order_by(DocumentChunk.chunk_index)
    target_chunks_result = await db.execute(target_chunks_query)
    target_text = "\n\n".join(c.content for c in target_chunks_result.scalars().all())
    
    if not source_text or not target_text:
        raise HTTPException(status_code=422, detail="One or both documents have no content")
        
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "compare", source_doc.document_id, payload.template_origin)
        
    try:
        analysis_result = await CompareAnalyzer.analyze(
            source_text, target_text,
            db=db, user_id=current_user.user_id, document_id=source_doc.document_id,
        )
        await complete_analysis_session(db, session, status="completed", start_time=start_time)
        
        # We must also return source and target document objects alongside the analysis result
        return {
            "source_document": {
                "id": str(source_doc.document_id),
                "title": source_doc.title,
                "text": source_text
            },
            "target_document": {
                "id": str(target_doc.document_id),
                "title": target_doc.title,
                "text": target_text
            },
            **analysis_result
        }
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

@router.post("/code/review")
async def intelligence_code_review(
    payload: CodeSuiteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.code_analysis.analyzer import CodeAnalyzer
    
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "code", template_origin=payload.template_origin)
    
    try:
        result = await CodeAnalyzer.analyze(
            code=payload.snippet,
            language_hint=payload.language,
            db=db,
            user_id=current_user.user_id,
        )
        await complete_analysis_session(db, session, status="completed", start_time=start_time, confidence=result.get("overall_score"))
        return result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

@router.post("/code/explain")
async def intelligence_code_explain(
    payload: CodeSuiteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.code_suite_service import CodeSuiteService
    
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "code", template_origin=payload.template_origin)
    
    try:
        result = await CodeSuiteService.analyze(
            db=db,
            snippet=payload.snippet,
            operation="explain",
            language=payload.language,
            user_id=current_user.user_id,
        )
        await complete_analysis_session(db, session, status="completed", start_time=start_time)
        return result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

@router.post("/code/docs")
async def intelligence_code_docs(
    payload: CodeSuiteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.code_suite_service import CodeSuiteService
    
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "code", template_origin=payload.template_origin)
    
    try:
        result = await CodeSuiteService.analyze(
            db=db,
            snippet=payload.snippet,
            operation="docs",
            language=payload.language,
            user_id=current_user.user_id,
        )
        await complete_analysis_session(db, session, status="completed", start_time=start_time)
        return result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

@router.post("/code/optimize")
async def intelligence_code_optimize(
    payload: CodeSuiteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.code_analysis.analyzer import CodeAnalyzer
    import time
    
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "code", template_origin=payload.template_origin)
    
    try:
        result = await CodeAnalyzer.analyze(
            code=payload.snippet,
            language_hint=payload.language,
            operation="optimize",
            db=db,
            user_id=current_user.user_id,
        )
        await complete_analysis_session(db, session, status="completed", start_time=start_time, confidence=result.get("overall_score"))
        return result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

@router.post("/code/security")
async def intelligence_code_security(
    payload: CodeSuiteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.code_analysis.analyzer import CodeAnalyzer
    import time
    
    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "code", template_origin=payload.template_origin)
    
    try:
        result = await CodeAnalyzer.analyze(
            code=payload.snippet,
            language_hint=payload.language,
            operation="security",
            db=db,
            user_id=current_user.user_id,
        )
        await complete_analysis_session(db, session, status="completed", start_time=start_time, confidence=result.get("overall_score"))
        return result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

@router.post("/domain-radar")
async def intelligence_domain_radar(
    payload: DomainRadarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.domain_radar import DomainRadar
    
    # Verify auth
    doc = await db.get(Document, uuid.UUID(payload.document_id))
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    # Reconstruct text
    result = await db.execute(select(DocumentChunk).where(DocumentChunk.document_id == doc.document_id).order_by(DocumentChunk.chunk_index))
    chunks = result.scalars().all()
    
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no extractable text.")
        
    full_text = "\n\n".join([chunk.content for chunk in chunks])
    metadata = {
        "id": str(doc.document_id),
        "title": doc.title,
        "user_id": str(current_user.user_id),
    }

    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "domain_radar", doc.document_id, payload.template_origin)
    
    try:
        analysis_result = await DomainRadar.analyze(db, full_text, metadata)
        await complete_analysis_session(db, session, status="completed", start_time=start_time)
        return analysis_result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

class ClinicalRequest(BaseModel):
    document_id: str
    template_origin: Optional[str] = None

@router.post("/clinical")
async def intelligence_clinical(
    payload: ClinicalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.clinical_analyzer import ClinicalAnalyzer
    
    # Verify auth
    doc = await db.get(Document, uuid.UUID(payload.document_id))
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    # Reconstruct text
    result = await db.execute(select(DocumentChunk).where(DocumentChunk.document_id == doc.document_id).order_by(DocumentChunk.chunk_index))
    chunks = result.scalars().all()
    
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no extractable text.")
        
    full_text = "\n\n".join([chunk.content for chunk in chunks])
    metadata = {
        "id": str(doc.document_id),
        "title": doc.title,
        "user_id": str(current_user.user_id),
    }

    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "clinical", doc.document_id, payload.template_origin)
    
    try:
        analysis_result = await ClinicalAnalyzer.analyze(db, full_text, metadata)
        await complete_analysis_session(db, session, status="completed", start_time=start_time, confidence=analysis_result.get("overall_confidence"))
        return analysis_result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e

class LegalAnalyzerRequest(BaseModel):
    document_id: str
    template_origin: Optional[str] = None

@router.post("/legal")
async def intelligence_legal(
    payload: LegalAnalyzerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from proxima.services.contract_analyzer import ContractAnalyzer

    # Verify auth + ownership
    doc = await db.get(Document, uuid.UUID(payload.document_id))
    if not doc or doc.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")

    # Reconstruct full text from chunks
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc.document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = result.scalars().all()

    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no extractable text.")

    full_text = "\n\n".join([chunk.content for chunk in chunks])
    metadata = {
        "document_id": str(doc.document_id),
        "filename": doc.title,
        "mime_type": getattr(doc, "mime_type", None),
        "user_id": str(current_user.user_id),
    }

    start_time = time.time()
    session = await create_analysis_session(db, current_user.user_id, "legal", doc.document_id, payload.template_origin)

    try:
        analysis_result = await ContractAnalyzer.analyze(db, full_text, metadata)
        await complete_analysis_session(db, session, status="completed", start_time=start_time, confidence=analysis_result.get("extraction_confidence", 0))
        return analysis_result
    except Exception as e:
        await complete_analysis_session(db, session, status="failed", start_time=start_time)
        raise e
