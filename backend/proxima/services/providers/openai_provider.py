class OpenAIProvider:
    def __init__(self):
        pass

    async def stream_completion(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int):
        # Stage 2 Implementation
        raise NotImplementedError("OpenAI provider not implemented in Stage 1")

    async def get_embedding(self, model_id: str, text: str):
        # Stage 2 Implementation
        raise NotImplementedError("OpenAI provider not implemented in Stage 1")
