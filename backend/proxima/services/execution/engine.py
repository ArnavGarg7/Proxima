import json
import time
import asyncio
import random
from typing import Type, Optional, AsyncGenerator, Any
from uuid import UUID
from pydantic import BaseModel, ValidationError
import structlog
from fastapi import HTTPException

from proxima.services.model_registry import model_registry
from proxima.services.execution.auditor import AIAuditor
from proxima.services.execution.errors import (
    AIExecutionError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    ProviderAuthenticationError,
    SchemaValidationError,
    UnknownExecutionError,
)

logger = structlog.get_logger()

class AIExecutionRequest(BaseModel):
    task_class: str
    domain: Optional[str] = None
    system_prompt: str
    user_message: str
    structured_output_schema: Optional[Type[BaseModel]] = None
    user_id: Optional[UUID] = None
    document_id: Optional[UUID] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

class AIExecutionResult(BaseModel):
    validated_data: Optional[BaseModel] = None
    provider: str
    model_id: str
    latency_ms: int
    error: Optional[AIExecutionError] = None

    class Config:
        arbitrary_types_allowed = True

class AIStreamingResult(BaseModel):
    content_stream: AsyncGenerator[str, None]
    provider: str
    model_id: str

    class Config:
        arbitrary_types_allowed = True

class ProximaAIEngine:
    @staticmethod
    def _map_http_exception(e: Exception) -> AIExecutionError:
        """Map provider exceptions to normalized AIExecutionError."""
        if isinstance(e, HTTPException):
            if e.status_code in (401, 403):
                return ProviderAuthenticationError(str(e))
            elif e.status_code == 429:
                return ProviderRateLimitError(str(e))
            elif e.status_code == 504:
                return ProviderTimeoutError(str(e))
            return UnknownExecutionError(str(e), status_code=e.status_code)

        err_str = str(e).lower()
        if "timeout" in err_str:
            return ProviderTimeoutError(str(e))
        if "429" in err_str or "rate limit" in err_str or "quota" in err_str:
            # Differentiate rate limit throttling from account quota exhaustion
            if "billing" in err_str or "exhausted" in err_str or "limit reached" in err_str:
                return UnknownExecutionError(str(e), status_code=429)
            return ProviderRateLimitError(str(e))
        if "unauthenticated" in err_str or "api key" in err_str or "401" in err_str:
            return ProviderAuthenticationError(str(e))

        return UnknownExecutionError(str(e))

    @staticmethod
    def _clean_json_response(raw_response: str) -> str:
        """Strip markdown code blocks around JSON responses."""
        cleaned = raw_response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        return cleaned.strip()

    @classmethod
    async def execute(cls, db, request: AIExecutionRequest, stream: bool = False):
        candidates = await model_registry.get_routing_candidates_for_task(request.task_class, request.domain, db)
        if not candidates:
            raise UnknownExecutionError("No candidates available for routing")

        # Global constraints
        global_attempts_limit = 10
        total_global_attempts = 0
        skipped_providers = set()

        if stream:
            # Streaming implementation
            # We try candidate models in sequence for the INITIAL connection attempt only.
            # Jittered exponential retries can happen on connection, but once the first chunk is yielded,
            # we cordon retries/fallback.
            for model in candidates:
                if model.provider in skipped_providers:
                    logger.debug("engine.skip_provider_candidate", provider=model.provider, model_id=model.model_id)
                    continue

                if total_global_attempts >= global_attempts_limit:
                    logger.warn("engine.global_attempts_exhausted", total_attempts=total_global_attempts)
                    break

                # Max 4 attempts per candidate for initial connection (1 initial + 3 retries)
                max_model_attempts = 4

                for attempt in range(1, max_model_attempts + 1):
                    total_global_attempts += 1
                    logger.debug(
                        "engine.stream_attempt_start",
                        provider=model.provider,
                        model_id=model.model_id,
                        attempt=attempt
                    )

                    try:
                        # Attempt to establish stream
                        generator = model_registry.stream_completion(
                            model=model,
                            system_prompt=request.system_prompt,
                            user_message=request.user_message,
                            temperature=request.temperature if request.temperature is not None else 0.7,
                            max_tokens=request.max_tokens if request.max_tokens is not None else 2048
                        )

                        # We must cordon retry/fallback once the first chunk yields.
                        # To do this safely, we construct a generator wrapper.
                        async def chunk_cordoned_generator() -> AsyncGenerator[str, None]:
                            first_chunk_received = False
                            try:
                                async for chunk in generator:
                                    first_chunk_received = True
                                    yield chunk
                            except Exception as stream_err:
                                if not first_chunk_received:
                                    # Rethrow so the model attempt loop catches it and tries next attempt or candidate
                                    raise stream_err
                                else:
                                    # Streaming is already in progress, retry/fallback is cordoned.
                                    # Rethrow so the router's try/except catches it and yields the SSE error block natively.
                                    logger.error("engine.stream_midway_disconnected", error=str(stream_err))
                                    raise RuntimeError("Stream disconnected midway.") from stream_err

                        # Evaluate first chunk before returning success to ensure connection is live.
                        wrapped_gen = chunk_cordoned_generator()

                        # Return the result
                        logger.info("engine.stream_success", provider=model.provider, model_id=model.model_id)
                        return AIStreamingResult(
                            content_stream=wrapped_gen,
                            provider=model.provider,
                            model_id=model.model_id
                        )

                    except Exception as e:
                        normalized_err = cls._map_http_exception(e)

                        # Handle provider-wide skipping
                        if normalized_err.is_provider_wide:
                            logger.warn(
                                "engine.provider_wide_failure_detected",
                                provider=model.provider,
                                error_type=type(normalized_err).__name__
                            )
                            skipped_providers.add(model.provider)
                            break # Skip other attempts for this candidate

                        # If permanent or exhausted attempts, fallback
                        if not normalized_err.is_transient or attempt == max_model_attempts:
                            logger.warn(
                                "engine.stream_attempt_failed",
                                provider=model.provider,
                                model_id=model.model_id,
                                attempt=attempt,
                                is_transient=normalized_err.is_transient,
                                error=str(normalized_err)
                            )
                            break # Fallback to next candidate

                        # Backoff with jitter
                        backoff = min(8.0, 0.5 * (2 ** attempt)) + random.uniform(0.0, 0.1)
                        await asyncio.sleep(backoff)

            # If all candidates exhausted
            raise UnknownExecutionError("All candidate models failed to stream")

        # Non-streaming completions
        last_error = None
        for model in candidates:
            if model.provider in skipped_providers:
                logger.debug("engine.skip_provider_candidate", provider=model.provider, model_id=model.model_id)
                continue

            if total_global_attempts >= global_attempts_limit:
                logger.warn("engine.global_attempts_exhausted", total_attempts=total_global_attempts)
                break

            max_model_attempts = 4

            for attempt in range(1, max_model_attempts + 1):
                total_global_attempts += 1
                logger.info(
                    "engine.execution_attempt_start",
                    provider=model.provider,
                    model_id=model.model_id,
                    attempt=attempt,
                    task_class=request.task_class
                )

                start_time = time.time()
                try:
                    raw_response = await model_registry.complete(
                        model=model,
                        system_prompt=request.system_prompt,
                        user_message=request.user_message,
                        temperature=0.1,
                        max_tokens=8192,
                        response_format="json" if request.structured_output_schema else "text",
                        structured_output_schema=request.structured_output_schema
                    )

                    latency_ms = int((time.time() - start_time) * 1000)

                    if not request.structured_output_schema:
                        # Log request asynchronously via auditor
                        await AIAuditor.log_request(
                            db=db,
                            user_id=request.user_id,
                            document_id=request.document_id,
                            model=model,
                            task_class=request.task_class,
                            prompt_content=request.system_prompt + "\n" + request.user_message,
                            response_content=raw_response
                        )

                        logger.info(
                            "engine.execute_success",
                            provider=model.provider,
                            model_id=model.model_id,
                            latency_ms=latency_ms,
                            total_attempts=attempt
                        )
                        return AIExecutionResult(
                            validated_data=None,
                            provider=model.provider,
                            model_id=model.model_id,
                            latency_ms=latency_ms,
                            error=None
                        )

                    cleaned_json = cls._clean_json_response(raw_response)

                    try:
                        result_dict = json.loads(cleaned_json)
                    except json.JSONDecodeError as json_err:
                        raise SchemaValidationError(f"Invalid JSON returned by provider: {json_err}. Raw string: {cleaned_json[:200]}")

                    try:
                        validated_model = request.structured_output_schema(**result_dict)
                    except ValidationError as val_err:
                        raise SchemaValidationError(f"JSON did not match Pydantic schema: {val_err}")

                    # Log request asynchronously via auditor
                    await AIAuditor.log_request(
                        db=db,
                        user_id=request.user_id,
                        document_id=request.document_id,
                        model=model,
                        task_class=request.task_class,
                        prompt_content=request.system_prompt + "\n" + request.user_message,
                        response_content=raw_response
                    )

                    logger.info(
                        "engine.execute_success",
                        provider=model.provider,
                        model_id=model.model_id,
                        latency_ms=latency_ms,
                        total_attempts=attempt,
                        validation_status="success"
                    )
                    return AIExecutionResult(
                        validated_data=validated_model,
                        provider=model.provider,
                        model_id=model.model_id,
                        latency_ms=latency_ms,
                        error=None
                    )

                except Exception as e:
                    latency_ms = int((time.time() - start_time) * 1000)
                    normalized_err = cls._map_http_exception(e) if not isinstance(e, AIExecutionError) else e
                    last_error = normalized_err

                    logger.warn(
                        "engine.execution_attempt_failed",
                        provider=model.provider,
                        model_id=model.model_id,
                        attempt=attempt,
                        latency_ms=latency_ms,
                        error_type=type(normalized_err).__name__,
                        error_msg=str(normalized_err)
                    )

                    # Check provider-wide failure
                    if normalized_err.is_provider_wide:
                        logger.warn(
                            "engine.provider_wide_failure_skipping",
                            provider=model.provider,
                            error_type=type(normalized_err).__name__
                        )
                        skipped_providers.add(model.provider)
                        break # Fallback immediately

                    # If permanent failure or exhausted retries, fallback
                    if not normalized_err.is_transient or attempt == max_model_attempts:
                        break # Fallback to next candidate

                    # Exponential backoff with random jitter
                    backoff = min(8.0, 0.5 * (2 ** attempt)) + random.uniform(0.0, 0.1)
                    await asyncio.sleep(backoff)

        # Return final accumulated error
        logger.error(
            "engine.execute_failure",
            task_class=request.task_class,
            total_attempts=total_global_attempts,
            final_error=str(last_error)
        )
        return AIExecutionResult(
            validated_data=None,
            provider=candidates[-1].provider if candidates else "unknown",
            model_id=candidates[-1].model_id if candidates else "unknown",
            latency_ms=0,
            error=last_error or UnknownExecutionError("All candidate models failed")
        )
