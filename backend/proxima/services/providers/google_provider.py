import google.generativeai as genai
from proxima.config import settings
import json

class GoogleProvider:
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)

    async def stream_completion(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int):
        model = genai.GenerativeModel(model_id)
        
        response = await model.generate_content_async(
            user_message,
            stream=True,
            generation_config={
                'temperature': temperature,
                'max_output_tokens': max_tokens,
            },
            system_instruction=system_prompt,
        )
        async for chunk in response:
            if chunk.text:
                yield chunk.text

    async def get_embedding(self, model_id: str, text: str):
        result = await genai.embed_content_async(
            model=f"models/{model_id}",
            content=text,
            task_type="retrieval_document",
        )
        return result['embedding']
