import google.generativeai as genai
from proxima.config import settings
import json
import os
import asyncio
from typing import AsyncGenerator
from fastapi import HTTPException

class GoogleProvider:
    def __init__(self):
        # We rely on settings.gemini_api_key which should be populated by env
        self.api_key = settings.gemini_api_key
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def _get_model_id(self, requested_id: str) -> str:
        # Force using gemini-2.5-flash as gemini-1.5-flash is retired
        return os.getenv("DEFAULT_GEMINI_MODEL", "gemini-2.5-flash")

    def _handle_error(self, e: Exception):
        err_msg = str(e).lower()
        if "api key" in err_msg or "unauthenticated" in err_msg or "401" in err_msg or "403" in err_msg:
            raise HTTPException(status_code=401, detail="Invalid API key provided.")
        elif "timeout" in err_msg:
            raise HTTPException(status_code=504, detail="Provider timeout.")
        elif "unavailable" in err_msg or "503" in err_msg or "500" in err_msg:
            raise HTTPException(status_code=502, detail=f"Provider unavailable: {str(e)}")
        else:
            raise HTTPException(status_code=500, detail=f"Provider Error: {str(e)}")

    async def complete(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int, response_format: str = "text") -> str:
        if not self.api_key:
            raise HTTPException(status_code=401, detail="Invalid API key provided. API key is missing.")

        model_name = self._get_model_id(model_id)
        model = genai.GenerativeModel(model_name, system_instruction=system_prompt)
        
        generation_config = {
            'temperature': temperature,
            'max_output_tokens': max_tokens,
        }
        if response_format == "json":
            generation_config['response_mime_type'] = 'application/json'
        
        try:
            # Running synchronous generate_content in a thread since genai API can be tricky, 
            # or use async if supported natively without blocking.
            # `generate_content_async` exists.
            response = await asyncio.wait_for(
                model.generate_content_async(
                    user_message,
                    generation_config=generation_config
                ),
                timeout=30.0
            )
            return response.text
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Provider timeout.")
        except Exception as e:
            self._handle_error(e)

    async def stream_completion(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        if not self.api_key:
            raise HTTPException(status_code=401, detail="Invalid API key provided. API key is missing.")

        model_name = self._get_model_id(model_id)
        model = genai.GenerativeModel(model_name, system_instruction=system_prompt)
        
        try:
            # We wrap the initial call in a timeout. The streaming iteration can also be timed out if needed.
            response = await asyncio.wait_for(
                model.generate_content_async(
                    user_message,
                    stream=True,
                    generation_config={
                        'temperature': temperature,
                        'max_output_tokens': max_tokens,
                    }
                ),
                timeout=10.0
            )
            
            async for chunk in response:
                try:
                    if chunk.text:
                        yield chunk.text
                except ValueError:
                    pass # Safety block or empty part
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Provider timeout.")
        except Exception as e:
            self._handle_error(e)

    async def get_embedding(self, model_id: str, text: str):
        if not self.api_key:
            raise HTTPException(status_code=401, detail="Invalid API key provided. API key is missing.")
            
        try:
            result = await asyncio.wait_for(
                genai.embed_content_async(
                    model=f"models/{model_id}",
                    content=text,
                    task_type="retrieval_document",
                ),
                timeout=10.0
            )
            return result['embedding']
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Provider timeout.")
        except Exception as e:
            self._handle_error(e)
