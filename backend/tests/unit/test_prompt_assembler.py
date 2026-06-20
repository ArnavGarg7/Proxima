import pytest
from proxima.services.prompt_registry import PromptRegistryService
from proxima.services.prompt_assembler import PromptAssemblerService
from unittest.mock import AsyncMock

@pytest.fixture
def mock_registry():
    registry = AsyncMock(spec=PromptRegistryService)
    registry.get_prompt.return_value = "You are a highly intelligent AI assistant."
    return registry

@pytest.fixture
def assembler(mock_registry):
    return PromptAssemblerService(registry_service=mock_registry)

@pytest.mark.asyncio
async def test_assemble_prompt(assembler, mock_registry):
    domain_key = "system_legal"
    context = "This contract is null and void."
    task = "Summarize the contract."
    
    mock_registry.get_prompt.return_value = "You are a legal AI."
    
    final_prompt = await assembler.assemble_prompt(domain_key, context, task)
    
    assert "You are a legal AI." in final_prompt
    assert "### CONTEXT ###\nThis contract is null and void." in final_prompt
    assert "### USER TASK ###\nSummarize the contract." in final_prompt

@pytest.mark.asyncio
async def test_assemble_prompt_fallback(assembler, mock_registry):
    mock_registry.get_prompt.side_effect = [None, "Default system prompt."]
    
    final_prompt = await assembler.assemble_prompt("missing_domain", "ctx", "task")
    
    assert "Default system prompt." in final_prompt

@pytest.mark.asyncio
async def test_assemble_prompt_absolute_fallback(assembler, mock_registry):
    mock_registry.get_prompt.side_effect = [None, None]
    
    final_prompt = await assembler.assemble_prompt("missing_domain", "ctx", "task")
    
    assert "You are a helpful AI assistant." in final_prompt
