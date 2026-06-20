"""
Prompt Registry Service.

Responsible for the storage, retrieval, and version management of
canonical system prompts and templates.
"""

from typing import Optional, Dict
from proxima.models.ai import PromptVersion
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid

# Canonical seeds
SEED_PROMPTS = {
    "system_legal": "You are an expert legal AI assistant. Review the provided context focusing on liabilities and contractual obligations.",
    "system_medical": "You are an expert medical AI assistant. Extract clinical facts, diagnoses, and treatments accurately without prescribing.",
    "system_code": "You are a senior software engineer. Analyze the code context, identify bugs, and suggest optimizations.",
    "system_default": "You are Proxima, a highly intelligent AI assistant. Use the provided context to answer accurately."
}

class PromptRegistryService:
    def __init__(self, db_session: AsyncSession):
        """
        Initialize the PromptRegistryService.
        """
        self.db = db_session
        self._cache: Dict[str, str] = {}

    async def seed_canonical_prompts(self):
        """Seeds default canonical prompts if not present."""
        for key, text in SEED_PROMPTS.items():
            existing = await self.get_prompt(key)
            if not existing:
                await self.save_prompt(key, text)

    async def get_prompt(self, prompt_key: str, version: Optional[int] = None) -> Optional[str]:
        """
        Retrieves a prompt template by key. If version is not provided, 
        returns the latest active version. Uses caching for latest version lookups.
        """
        cache_key = f"{prompt_key}:v{version}" if version else f"{prompt_key}:latest"
        
        if cache_key in self._cache:
            return self._cache[cache_key]

        query = select(PromptVersion).where(PromptVersion.name == prompt_key)
        if version is not None:
            query = query.where(PromptVersion.version == version)
        else:
            query = query.order_by(desc(PromptVersion.version)).limit(1)

        result = await self.db.execute(query)
        prompt_record = result.scalar_one_or_none()
        
        if not prompt_record:
            return None
            
        content = prompt_record.template
        self._cache[cache_key] = content
        return content

    async def save_prompt(self, prompt_key: str, content: str) -> int:
        """
        Saves a new prompt or creates a new version of an existing prompt.
        """
        query = select(PromptVersion).where(PromptVersion.name == prompt_key).order_by(desc(PromptVersion.version)).limit(1)
        result = await self.db.execute(query)
        latest = result.scalar_one_or_none()
        
        next_version = (latest.version + 1) if latest else 1
        
        new_prompt = PromptVersion(
            name=prompt_key,
            template=content,
            version=next_version,
            description=f"Auto-saved version {next_version}"
        )
        self.db.add(new_prompt)
        await self.db.commit()
        
        # Invalidate cache for 'latest'
        cache_key_latest = f"{prompt_key}:latest"
        self._cache[cache_key_latest] = content
        self._cache[f"{prompt_key}:v{next_version}"] = content
        
        return next_version
