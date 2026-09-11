"""Synchronous DB engine for Alembic migrations."""
from sqlalchemy import create_engine

from app.core.config import get_settings

settings = get_settings()

sync_engine = create_engine(settings.database_url_sync, echo=False)
