"""Application configuration loaded from environment / .env file."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Sanadi AI"
    debug: bool = True
    database_url: str = "sqlite:///./sanadi.db"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    # Single-call mode collapses the whole multi-agent pipeline into ONE Gemini
    # request per message. Essential on the free tier (5 requests/min). Set to
    # false to use the full fan-out pipeline (needs a higher quota / paid tier).
    single_call_mode: bool = True

    # Auth
    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
