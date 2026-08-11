class AIExecutionError(Exception):
    """Base class for all AI Execution errors."""
    @property
    def is_transient(self) -> bool:
        return False

    @property
    def is_provider_wide(self) -> bool:
        return False

class ProviderTimeoutError(AIExecutionError):
    """Raised when a provider request times out."""
    @property
    def is_transient(self) -> bool:
        return True

class ProviderRateLimitError(AIExecutionError):
    """Raised when a provider returns a rate limit (429) error."""
    @property
    def is_transient(self) -> bool:
        return True

class ProviderAuthenticationError(AIExecutionError):
    """Raised when authentication with the provider fails."""
    @property
    def is_provider_wide(self) -> bool:
        return True

class SchemaValidationError(AIExecutionError):
    """Raised when the LLM returns invalid JSON or misses required Pydantic fields."""
    pass

class UnknownExecutionError(AIExecutionError):
    """Raised for any unknown or unhandled provider errors."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code

    @property
    def is_transient(self) -> bool:
        # HTTP 500, 502, 503 are transient. 400 is not.
        return self.status_code >= 500

    @property
    def is_provider_wide(self) -> bool:
        # Accounts-level billing block/quota limit depletion mapped to 402/403/429 wide errors.
        # Check if message contains quota/billing exhaustion.
        msg = str(self).lower()
        if "billing" in msg or "account quota" in msg or "depleted" in msg:
            return True
        return False
