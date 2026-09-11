"""Application configuration.

Loads settings from environment variables with secure defaults.
Never hard-code secrets in this file.
"""
from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "De-Prince Digital Hub"
    app_env: str = Field("development", env="APP_ENV")
    debug: bool = Field(True, env="DEBUG")
    secret_key: str = Field(..., env="SECRET_KEY")
    allowed_hosts: List[str] = Field(["localhost", "127.0.0.1"], env="ALLOWED_HOSTS")

    # Database
    database_url: str = Field(..., env="DATABASE_URL")
    database_url_sync: str = Field(..., env="DATABASE_URL_SYNC")

    # JWT
    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, env="REFRESH_TOKEN_EXPIRE_DAYS")

    # CORS
    cors_origins: List[str] = Field(["http://localhost:3000"], env="CORS_ORIGINS")

    # File upload
    upload_dir: str = Field("./uploads", env="UPLOAD_DIR")
    max_upload_size_mb: int = Field(50, env="MAX_UPLOAD_SIZE_MB")
    allowed_extensions: List[str] = Field(
        ["pdf", "docx", "doc", "pptx", "xlsx", "jpg", "jpeg", "png", "zip"],
        env="ALLOWED_EXTENSIONS"
    )

    # Payments
    paystack_secret_key: str = Field("", env="PAYSTACK_SECRET_KEY")
    paystack_public_key: str = Field("", env="PAYSTACK_PUBLIC_KEY")
    flutterwave_secret_key: str = Field("", env="FLUTTERWAVE_SECRET_KEY")
    flutterwave_public_key: str = Field("", env="FLUTTERWAVE_PUBLIC_KEY")

    # Identity verification
    identity_provider: str = Field("mock", env="IDENTITY_PROVIDER")
    sme_nin_secret: str = Field("", env="SME_NIN_SECRET")
    sme_bvn_secret: str = Field("", env="SME_BVN_SECRET")

    # Email
    smtp_host: str = Field("", env="SMTP_HOST")
    smtp_port: int = Field(587, env="SMTP_PORT")
    smtp_user: str = Field("", env="SMTP_USER")
    smtp_password: str = Field("", env="SMTP_PASSWORD")
    email_from: str = Field("noreply@deprince.com", env="EMAIL_FROM")

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("allowed_hosts", "cors_origins", "allowed_extensions", mode="before")
    @classmethod
    def _parse_list(cls, v):
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

@lru_cache()
def get_settings() -> Settings:
    return Settings()
