import os
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator

class Settings(BaseSettings):
    database_url: str = Field(default="postgresql+psycopg://pcclub:pcclub@db:5432/pcclub", alias="DATABASE_URL")
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

    @field_validator('database_url', mode='after')
    @classmethod
    def fix_database_host(cls, v: str) -> str:
        """Исправляет localhost/127.0.0.1 на 'db' в Docker окружении"""
        # Проверяем, запущены ли мы в Docker (проверяем наличие /proc/1/cgroup или переменной окружения)
        in_docker = os.path.exists('/.dockerenv') or os.path.exists('/proc/1/cgroup')
        
        if in_docker:
            # Заменяем localhost и 127.0.0.1 на 'db' для Docker Compose
            if 'localhost' in v or '127.0.0.1' in v:
                v = v.replace('localhost', 'db').replace('127.0.0.1', 'db')
                print(f"Warning: DATABASE_URL contained localhost/127.0.0.1, replaced with 'db' for Docker")
        
        return v

settings = Settings()

# Логируем DATABASE_URL при старте (скрывая пароль)
def get_database_url_for_logging(url: str) -> str:
    """Возвращает DATABASE_URL с скрытым паролем для логирования"""
    try:
        if '@' in url:
            parts = url.split('@')
            if len(parts) == 2:
                auth_part = parts[0]
                rest = parts[1]
                if ':' in auth_part:
                    user_pass = auth_part.split('://')
                    if len(user_pass) == 2:
                        scheme = user_pass[0]
                        credentials = user_pass[1]
                        if ':' in credentials:
                            user = credentials.split(':')[0]
                            return f"{scheme}://{user}:***@{rest}"
        return url
    except:
        return "***"

print(f"Database URL: {get_database_url_for_logging(settings.database_url)}")
