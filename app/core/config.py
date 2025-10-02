from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    database_url: str = Field(default="sqlite+aiosqlite:///./dev.db", alias="DATABASE_URL")
    secret_key: str = Field(default="dev-secret", alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }

settings = Settings()
