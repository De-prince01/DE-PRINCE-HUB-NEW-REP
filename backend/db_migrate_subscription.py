"""Create subscription tables in the SQLite DB (idempotent)."""
import asyncio
import os
import sys

from sqlalchemy import create_engine
from app.core.config import get_settings
from app.core.database import Base
import app.models  # noqa: F401  (registers all models)

settings = get_settings()
url = settings.database_url
if url.startswith("sqlite+aiosqlite:///"):
    url = "sqlite:///" + url[len("sqlite+aiosqlite:///"):]

engine = create_engine(url, pool_pre_ping=True)


def main():
    # Create only the subscription tables that don't exist yet.
    # We need their ORM tables.
    from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionRenewal
    tables = [SubscriptionPlan.__table__, Subscription.__table__, SubscriptionRenewal.__table__]
    existing = set(engine.table_names() if hasattr(engine, "table_names") else __import__("sqlalchemy").inspect(engine).get_table_names())
    for t in tables:
        if t.name in existing:
            print(f"SKIP {t.name} (exists)")
        else:
            t.create(engine)
            print(f"CREATED {t.name}")
    print("done")


if __name__ == "__main__":
    main()
