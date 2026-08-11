import json
import time
from typing import Type, Optional, AsyncGenerator
from pydantic import BaseModel, ValidationError
import structlog
from fastapi import HTTPException

from proxima.services.model_registry import model_registry
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
            if e.status_code == 401 or e.status_code == 403:
                return ProviderAuthenticationError(str(e))
            elif e.status_code == 429:
                return ProviderRateLimitError(str(e))
            elif e.status_code == 504:
                return ProviderTimeoutError(str(e))
            
        err_str = str(e).lower()
        if "timeout" in err_str:
            return ProviderTimeoutError(str(e))
        if "429" in err_str or "rate limit" in err_str or "quota" in err_str:
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
        model = await model_registry.get_for_task(request.task_class, request.domain, db)
        
        system_prompt_final = request.system_prompt

        if request.structured_output_schema and not stream:
            # GoogleProvider uses response_mime_type='application/json' (Gemini native JSON mode).
            # This enforces JSON at the API level — no schema injection into the prompt is needed.
            #
            # OpenAIProvider (Groq) uses response_format={"type": "json_object"} which ensures
            # the output is valid JSON but does NOT enforce a specific schema. For these providers,
            # we add a compact field-list hint so the model targets the right keys.
            if model.provider != "google":
                field_names = list(request.structured_output_schema.model_fields.keys())
                system_prompt_final += (
                    f"\n\nRespond with a valid JSON object containing these keys: {field_names}."
                    "\nDo not include markdown formatting."
                )


        if stream:
            try:
                # stream_completion does not take response_format
                generator = model_registry.stream_completion(
                    model=model,
                    system_prompt=system_prompt_final,
                    user_message=request.user_message,
                    temperature=0.7, 
                    max_tokens=2048   
                )
                
                return AIStreamingResult(
                    content_stream=generator,
                    provider=model.provider,
                    model_id=model.model_id
                )
            except Exception as e:
                normalized_err = cls._map_http_exception(e)
                raise normalized_err

        start_time = time.time()
        try:
            raw_response = await model_registry.complete(
                model=model,
                system_prompt=system_prompt_final,
                user_message=request.user_message,
                temperature=0.1, 
                max_tokens=8192,
                response_format="json" if request.structured_output_schema else "text"
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            if not request.structured_output_schema:
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
                
            return AIExecutionResult(
                validated_data=validated_model,
                provider=model.provider,
                model_id=model.model_id,
                latency_ms=latency_ms,
                error=None
            )
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            
            if isinstance(e, AIExecutionError):
                normalized_err = e
            else:
                normalized_err = cls._map_http_exception(e)
                
            return AIExecutionResult(
                validated_data=None,
                provider=model.provider,
                model_id=model.model_id,
                latency_ms=latency_ms,
                error=normalized_err
            )
