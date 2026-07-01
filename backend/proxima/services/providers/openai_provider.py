import os
import json
from typing import AsyncGenerator
from fastapi import HTTPException
from openai import AsyncOpenAI

class OpenAIProvider:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.base_url = "https://api.groq.com/openai/v1"

    def _get_client(self):
        if not self.api_key:
            raise HTTPException(status_code=401, detail="API key is missing.")
        return AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)

    async def complete(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int, response_format: str = "text") -> str:
        client = self._get_client()
        kwargs = {}
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}
            
        try:
            response = await client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            return response.choices[0].message.content
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Provider Error: {str(e)}")

    async def stream_completion(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        client = self._get_client()
        try:
            stream = await client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Provider Error: {str(e)}")

    async def get_embedding(self, model_id: str, text: str):
        # Groq does not support embeddings, fallback to original if needed
        raise NotImplementedError("OpenAI provider embeddings not implemented")
