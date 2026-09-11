"""Add revenue_stream to service_categories (SQLite migration, idempotent)."""
from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings
from app.core.database import Base  # noqa: F401
import app.models  # noqa: F401

settings = get_settings()
url = settings.database_url
if url.startswith("sqlite+aiosqlite:///"):
    url = "sqlite:///" + url[len("sqlite+aiosqlite:///"):]

engine = create_engine(url, pool_pre_ping=True)

BACKFILL = {
    "Printing": "printing",
    "Graphic Design": "graphic_design",
    "Web Development": "web_development",
    "Computer Services": "computer_sessions",
    "Online Services": "service_fees",
    "Academic Services": "document_processing",
}


def main():
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("service_categories")}
    with engine.begin() as conn:
        if "revenue_stream" not in cols:
            conn.execute(text("ALTER TABLE service_categories ADD COLUMN revenue_stream VARCHAR(60)"))
            print("ADDED service_categories.revenue_stream")
        else:
            print("SKIP revenue_stream (exists)")
        for name, code in BACKFILL.items():
            conn.execute(
                text("UPDATE service_categories SET revenue_stream = :code WHERE name = :name AND revenue_stream IS NULL"),
                {"code": code, "name": name},
            )
            print(f"BACKFILL {name} -> {code}")
    print("done")


if __name__ == "__main__":
    main()