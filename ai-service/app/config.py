# =============================================================================
# AI Service Configuration
# =============================================================================
# Loads and validates environment variables using pydantic-settings.
# =============================================================================

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # AI Provider
    ai_provider: str = "gemini"  # "openai" or "gemini"

    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"

    # Gemini
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.0-flash"

    # Whisper
    whisper_mode: str = "local"  # "local" or "api"
    whisper_model_size: str = "base"  # tiny, base, small, medium, large

    # Security
    ai_service_api_key: str = "dev-api-key"

    # Storage
    storage_path: str = "/app/storage"

    # Logging
    log_level: str = "info"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
