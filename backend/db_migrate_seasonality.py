"""Add seasonality columns to services (SQLite migration, idempotent, spec 61)."""
from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings
from app.core.database import Base  # noqa: F401
import app.models  # noqa: F401

settings = get_settings()
url = settings.database_url
if url.startswith("sqlite+aiosqlite:///"):
    url = "sqlite:///" + url[len("sqlite+aiosqlite:///"):]

engine = create_engine(url, pool_pre_ping=True)

SEASONAL_MARKERS = ("jamb", "utme")


def main():
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("services")}
    with engine.begin() as conn:
        for col, ddl in (
            ("is_seasonal", "ALTER TABLE services ADD COLUMN is_seasonal BOOLEAN NOT NULL DEFAULT 0"),
            ("season_months", "ALTER TABLE services ADD COLUMN season_months JSON"),
            ("season_label", "ALTER TABLE services ADD COLUMN season_label VARCHAR(200)"),
        ):
            if col not in cols:
                conn.execute(text(ddl))
                print(f"ADDED services.{col}")
            else:
                print(f"SKIP services.{col} (exists)")

        # Backfill: mark JAMB/UTME services as seasonal (Jan-May), leave the rest year-round
        thawed = conn.execute(
            text("SELECT id FROM services WHERE LOWER(name) LIKE '%jamb%' OR LOWER(name) LIKE '%utme%'")
        ).fetchall()
        for (sid,) in thawed:
            conn.execute(
                text("UPDATE services SET is_seasonal = 1, "
                     "season_months = '[\"1\", \"2\", \"3\", \"4\", \"5\"]', "
                     "season_label = 'JAMB/UTME season (Jan-May)' WHERE id = :sid"),
                {"sid": sid},
            )
        print(f"BACKFILL seasonal: {len(thawed)} JAMB/UTME services")
    print("done")


if __name__ == "__main__":
    main()