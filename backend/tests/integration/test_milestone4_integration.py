import pytest
from proxima.services.retrieval_fts import FTSRetrievalService
from proxima.services.prompt_registry import PromptRegistryService
from proxima.services.prompt_assembler import PromptAssemblerService
from proxima.services.qhe import QualityHeuristicEngine

@pytest.mark.asyncio
async def test_full_retrieval_to_qhe_flow(db):
    from proxima.models.core import Document, DocumentChunk, User
    from sqlalchemy import select
    
    # Setup test user and doc
    result = await db.execute(select(User).limit(1))
    user = result.scalar_first()
    if not user:
        user = User(email="flow@example.com", name="Flow User")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    doc = Document(user_id=user.user_id, title="flow_test.txt", status="processed")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    chunk = DocumentChunk(
        document_id=doc.document_id, 
        chunk_index=0, 
        content="The defendant acknowledges the liability clause.", 
        chunk_type="text"
    )
    db.add(chunk)
    await db.commit()

    # 1. Retrieval
    fts = FTSRetrievalService(db)
    results = await fts.search("liability", document_id=str(doc.document_id))
    assert len(results) > 0

    # 2. Context Builder
    context_package = fts.build_context_package(results)
    assert "liability clause" in context_package

    # 3. Prompt Assembly
    registry = PromptRegistryService(db)
    await registry.seed_canonical_prompts()
    assembler = PromptAssemblerService(registry)
    
    final_prompt = await assembler.assemble_prompt("system_legal", context_package, "What is acknowledged?")
    assert "### CONTEXT ###" in final_prompt
    assert "liability clause" in final_prompt

    # 4. QHE Evaluation (Mocking AI Response)
    qhe = QualityHeuristicEngine()
    mock_ai_response = "The defendant acknowledges the liability clause clearly."
    eval_result = qhe.evaluate_response(final_prompt, mock_ai_response, "legal")
    
    assert eval_result["quality_classification"] == "High"
    assert eval_result["confidence_score"] == 90.0
