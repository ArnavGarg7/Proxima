from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    gemini_api_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/callback"
    jwt_private_key: str = ""
    jwt_public_key: str = ""
    jwt_algorithm: str = "RS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_bucket_name: str = "proxima-uploads"
    aws_region: str = "us-east-1"
    sentry_dsn: str = ""
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"
    monthly_ai_budget_usd: float = 50.00
    cost_alert_threshold: float = 0.80
    response_cache_ttl: int = 900
    embedding_cache_ttl: int = 86400
    enable_response_cache: bool = True
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    flower_password: str = "admin"
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    @property
    def storage_configured(self) -> bool:
        return bool(self.aws_access_key_id and self.aws_secret_access_key)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
