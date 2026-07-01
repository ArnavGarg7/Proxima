class AnthropicProvider:
    def __init__(self):
        pass

    async def stream_completion(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int):
        # Stage 2 Implementation
        raise NotImplementedError("Anthropic provider not implemented in Stage 1")

    async def complete(self, model_id: str, system_prompt: str, user_message: str, temperature: float, max_tokens: int, response_format: str = "text") -> str:
        # Anthropic doesn't have a direct JSON mode toggle in the API yet like OpenAI does,
        # but the prompt engineering usually handles it.
        raise NotImplementedError("Anthropic provider simple complete not implemented in Stage 1")

    async def get_embedding(self, model_id: str, text: str):
        # Stage 2 Implementation
        raise NotImplementedError("Anthropic provider not implemented in Stage 1")
