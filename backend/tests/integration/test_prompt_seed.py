"""Stage 8: required system prompts resolve to real domain prompts, not the
generic assistant fallback.

The prompts are seeded by migration 2026_08_25_prompts. This runs against the
migrated database; the genuinely-empty-DB proof is the fresh-deploy validation.
"""
import pytest

from proxima.services.prompt_registry import PromptRegistryService
from proxima.services.prompt_assembler import PromptAssemblerService

GENERIC_FALLBACK = "You are a helpful AI assistant."


@pytest.mark.asyncio
@pytest.mark.parametrize("domain_key", ["system_legal", "system_medical", "system_code", "system_default"])
async def test_system_prompt_is_present(db, domain_key):
    registry = PromptRegistryService(db)
    content = await registry.get_prompt(domain_key)
    assert content, f"{domain_key} is not seeded"
    assert content != GENERIC_FALLBACK


@pytest.mark.asyncio
async def test_assembler_does_not_fall_back_to_generic(db):
    registry = PromptRegistryService(db)
    assembler = PromptAssemblerService(registry)

    legal = await assembler.assemble_prompt("system_legal", "CTX", "What are the obligations?")
    assert not legal.startswith(GENERIC_FALLBACK)
    assert "legal" in legal.lower()

    code = await assembler.assemble_prompt("system_code", "CTX", "Review this")
    assert not code.startswith(GENERIC_FALLBACK)
