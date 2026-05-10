from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    ANTHROPIC_API_KEY: str
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "Relocation Hub <onboarding@resend.dev>"
    FRONTEND_URL: str = "http://localhost:3000"
    DAILY_AI_CALL_LIMIT: int = 5
    DAILY_VALIDATION_LIMIT: int = 10
    DAILY_RISK_SCORE_LIMIT: int = 3
    ADMIN_SECRET: str = ""
    MAX_VALIDATION_FILE_SIZE: int = 20 * 1024 * 1024  # 20MB


    class Config:
        env_file = ".env"

settings = Settings()