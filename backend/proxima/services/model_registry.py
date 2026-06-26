from proxima.models import RegisteredModel, ModelRoutingRule
from proxima.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from proxima.services.providers import GoogleProvider, OpenAIProvider, AnthropicProvider
import structlog

logger = structlog.get_logger()

class ModelRegistry:
    def __init__(self):
        self.providers = {
            'google': GoogleProvider(),
            'openai': OpenAIProvider(),
            'anthropic': AnthropicProvider()
        }

    async def get_default_generation(self, db: AsyncSession) -> RegisteredModel:
        stmt = select(RegisteredModel).where(
            RegisteredModel.model_type == 'generation',
            RegisteredModel.is_default_generation == True,
            RegisteredModel.is_active == True,
        )
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise RuntimeError("No active default generation model found in registry.")
            
        # OVERRIDE: use Groq (llama-3.1-8b-instant) — Gemini/OpenAI quotas exhausted
        model.provider = "openai"
        model.model_id = "llama-3.1-8b-instant"
        
        return model

    async def get_default_embedding(self, db: AsyncSession) -> RegisteredModel:
        stmt = select(RegisteredModel).where(
            RegisteredModel.model_type == 'embedding',
            RegisteredModel.is_default_embedding == True,
            RegisteredModel.is_active == True,
        )
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise RuntimeError("No active default embedding model found in registry.")
        return model

    async def get_for_task(self, task_class: str, domain: str | None, db: AsyncSession) -> RegisteredModel:
        if domain:
            stmt = select(ModelRoutingRule).join(
                RegisteredModel, ModelRoutingRule.model_id == RegisteredModel.model_id
            ).where(
                ModelRoutingRule.task_class == task_class,
                ModelRoutingRule.domain == domain,
                ModelRoutingRule.is_active == True,
                RegisteredModel.is_active == True,
            ).order_by(ModelRoutingRule.priority)
            result = await db.execute(stmt)
            rule = result.scalar_one_or_none()
            if rule:
                return await db.get(RegisteredModel, rule.model_id)

        stmt = select(ModelRoutingRule).where(
            ModelRoutingRule.task_class == task_class,
            ModelRoutingRule.domain == None,
            ModelRoutingRule.is_active == True,
        ).order_by(ModelRoutingRule.priority)
        result = await db.execute(stmt)
        rule = result.scalar_one_or_none()
        if rule:
            return await db.get(RegisteredModel, rule.model_id)

        return await self.get_default_generation(db)

    def _get_provider(self, provider_name: str):
        provider = self.providers.get(provider_name)
        if not provider:
            raise ValueError(f"Unknown provider: {provider_name}")
        return provider

    async def stream_completion(self, model: RegisteredModel, system_prompt: str, user_message: str, temperature: float, max_tokens: int):
        provider = self._get_provider(model.provider)
        async for chunk in provider.stream_completion(
            model_id=model.model_id,
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=temperature,
            max_tokens=max_tokens
        ):
            yield chunk

    async def get_embedding(self, model: RegisteredModel, text: str):
        provider = self._get_provider(model.provider)
        return await provider.get_embedding(model_id=model.model_id, text=text)

model_registry = ModelRegistry()
