from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    database_url: str = Field(default="sqlite+aiosqlite:///./dev.db", alias="DATABASE_URL")
    secret_key: str = Field(default="dev-secret", alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # PostgreSQL configuration
    postgres_user: str = Field(default="pcclub", alias="POSTGRES_USER")
    postgres_password: str = Field(default="pcclub", alias="POSTGRES_PASSWORD")
    postgres_db: str = Field(default="pcclub", alias="POSTGRES_DB")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    
    # API configuration
    api_port: int = Field(default=8000, alias="API_PORT")

    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }

settings = Settings()
