class AIExecutionError(Exception):
    """Base class for all AI Execution errors."""
    pass

class ProviderTimeoutError(AIExecutionError):
    """Raised when a provider request times out."""
    pass

class ProviderRateLimitError(AIExecutionError):
    """Raised when a provider returns a rate limit (429) error."""
    pass

class ProviderAuthenticationError(AIExecutionError):
    """Raised when authentication with the provider fails."""
    pass

class SchemaValidationError(AIExecutionError):
    """Raised when the LLM returns invalid JSON or misses required Pydantic fields."""
    pass

class UnknownExecutionError(AIExecutionError):
    """Raised for any unknown or unhandled provider errors."""
    pass
