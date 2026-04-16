from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Battle Oracle"
    database_url: str = "sqlite+aiosqlite:///./battle_oracle.db"
    secret_key: str = "change-me-in-production-please"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 43200  # 30 days

    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    telegram_bot_token: str = ""
    api_base_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
