"""Create support centre tables in the SQLite DB (idempotent)."""
from sqlalchemy import create_engine
from sqlalchemy import inspect

from app.core.config import get_settings
from app.core.database import Base
import app.models  # noqa: F401  (registers all models)

settings = get_settings()
url = settings.database_url
if url.startswith("sqlite+aiosqlite:///"):
    url = "sqlite:///" + url[len("sqlite+aiosqlite:///"):]

engine = create_engine(url, pool_pre_ping=True)


def main():
    from app.models.support import SupportTicket, SupportMessage, FAQ
    tables = [SupportTicket.__table__, SupportMessage.__table__, FAQ.__table__]
    existing = set(inspect(engine).get_table_names())
    for t in tables:
        if t.name in existing:
            print(f"SKIP {t.name} (exists)")
        else:
            t.create(engine)
            print(f"CREATED {t.name}")
    print("done")


if __name__ == "__main__":
    main()