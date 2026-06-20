"""
Prompt Assembler Service.

Responsible for taking canonical templates, domain contexts, and 
user queries, and assembling them into the final prompt payload 
sent to the AI Provider.
"""

from proxima.services.prompt_registry import PromptRegistryService
from typing import Dict, Any

class PromptAssemblerService:
    def __init__(self, registry_service: PromptRegistryService):
        """
        Initialize the PromptAssemblerService with its dependencies.
        
        Args:
            registry_service (PromptRegistryService): Service to fetch prompt templates.
        """
        self.registry_service = registry_service

    async def assemble_prompt(self, domain_key: str, context_text: str, user_task: str) -> str:
        """
        Assembles a final prompt string by fetching the base template and 
        injecting the provided context variables.
        
        Args:
            domain_key (str): The domain prompt key (e.g. 'system_legal').
            context_text (str): The retrieved knowledge context.
            user_task (str): The specific question or task from the user.
            
        Returns:
            str: The fully assembled prompt ready for the AI Provider.
        """
        system_prompt = await self.registry_service.get_prompt(domain_key)
        
        if not system_prompt:
            # Fallback to default
            system_prompt = await self.registry_service.get_prompt("system_default")
            
        if not system_prompt:
            # Absolute fallback if DB is not seeded
            system_prompt = "You are a helpful AI assistant."

        assembled_prompt = f"""{system_prompt}

### CONTEXT ###
{context_text}

### USER TASK ###
{user_task}

### INSTRUCTIONS ###
Answer the user's task based strictly on the context provided above.
"""
        return assembled_prompt
