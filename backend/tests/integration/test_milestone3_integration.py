import pytest
from proxima.services.domain_detector import DomainDetectorService
from proxima.services.prompt_registry import PromptRegistryService
from proxima.services.prompt_assembler import PromptAssemblerService

@pytest.mark.asyncio
async def test_domain_detection_to_assembler_flow(db):
    detector = DomainDetectorService()
    registry = PromptRegistryService(db)
    assembler = PromptAssemblerService(registry)
    
    # 1. Provide a document
    document_text = "The plaintiff claims the defendant breached the non-disclosure agreement."
    
    # 2. Detect Domain
    scores = await detector.detect_domain(document_text)
    
    # Find top domain
    top_domain = max(scores, key=scores.get)
    assert top_domain == "legal"
    
    # 3. Registry Seeding (simulating app startup)
    await registry.seed_canonical_prompts()
    
    # 4. Assembly
    domain_key = f"system_{top_domain}"
    final_prompt = await assembler.assemble_prompt(
        domain_key=domain_key,
        context_text=document_text,
        user_task="What is the claim?"
    )
    
    assert "expert legal AI assistant" in final_prompt
    assert "### CONTEXT ###\nThe plaintiff claims" in final_prompt
    assert "### USER TASK ###\nWhat is the claim?" in final_prompt
