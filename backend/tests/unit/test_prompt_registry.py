import pytest
from proxima.services.prompt_registry import PromptRegistryService

@pytest.mark.asyncio
async def test_prompt_seeding_and_retrieval(db):
    registry = PromptRegistryService(db)
    
    # Initial seed
    await registry.seed_canonical_prompts()
    
    # Retrieve standard
    prompt = await registry.get_prompt("system_legal")
    assert prompt is not None
    assert "legal AI assistant" in prompt

import uuid

@pytest.mark.asyncio
async def test_prompt_saving_and_versioning(db):
    registry = PromptRegistryService(db)
    prompt_key = f"custom_prompt_{uuid.uuid4()}"
    
    # Save first version
    v1 = await registry.save_prompt(prompt_key, "Version 1 text")
    assert v1 == 1
    
    # Save second version
    v2 = await registry.save_prompt(prompt_key, "Version 2 text")
    assert v2 == 2
    
    # Retrieve specific version
    p1 = await registry.get_prompt(prompt_key, version=1)
    assert p1 == "Version 1 text"
    
    # Retrieve latest
    p_latest = await registry.get_prompt(prompt_key)
    assert p_latest == "Version 2 text"

@pytest.mark.asyncio
async def test_prompt_caching(db):
    registry = PromptRegistryService(db)
    prompt_key = f"cache_test_{uuid.uuid4()}"
    await registry.save_prompt(prompt_key, "Initial content")
    
    # First fetch populates cache
    p1 = await registry.get_prompt(prompt_key)
    assert p1 == "Initial content"
    
    # Verify it hits cache directly (modifying db directly bypassing cache to prove it)
    from proxima.models.ai import PromptVersion
    from sqlalchemy import select, update
    
    await db.execute(update(PromptVersion).where(PromptVersion.prompt_key == prompt_key).values(content="Secret DB update"))
    await db.commit()
    
    p2 = await registry.get_prompt(prompt_key)
    # Should still be cached
    assert p2 == "Initial content"
