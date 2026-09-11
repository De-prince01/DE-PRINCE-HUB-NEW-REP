"""Add indexes for hot analytical/revenue queries (spec 66 performance). Idempotent."""
from sqlalchemy import create_engine, text

from app.core.config import get_settings

settings = get_settings()
url = settings.database_url
if url.startswith("sqlite+aiosqlite:///"):
    url = "sqlite:///" + url[len("sqlite+aiosqlite:///"):]

engine = create_engine(url, pool_pre_ping=True)

INDEXES = [
    ("idx_order_items_service", "CREATE INDEX IF NOT EXISTS idx_order_items_service ON order_items(service_id)"),
    ("idx_order_items_quantity", "CREATE INDEX IF NOT EXISTS idx_order_items_quantity ON order_items(quantity, total_price)"),
    ("idx_print_jobs_paid", "CREATE INDEX IF NOT EXISTS idx_print_jobs_paid ON print_jobs(status, is_paid)"),
    ("idx_sessions_paid", "CREATE INDEX IF NOT EXISTS idx_sessions_paid ON computer_sessions(is_paid)"),
    ("idx_commissions_paid", "CREATE INDEX IF NOT EXISTS idx_commissions_paid ON commissions(is_paid)"),
    ("idx_wallet_tx_type", "CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON wallet_transactions(type)"),
    ("idx_deliveries_status", "CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status)"),
    ("idx_access_audit_actor", "CREATE INDEX IF NOT EXISTS idx_access_audit_actor ON data_access_audits(actor_id)"),
    ("idx_privacy_reqs_type", "CREATE INDEX IF NOT EXISTS idx_privacy_reqs_type ON privacy_requests(request_type, status)"),
    ("idx_expenses_created", "CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at)"),
]


def main():
    with engine.begin() as conn:
        created = 0
        for name, ddl in INDEXES:
            existing = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type = 'index' AND name = :n"), {"n": name}
            ).fetchall()
            if existing:
                print(f"SKIP {name} (exists)")
                continue
            conn.execute(text(ddl))
            created += 1
            print(f"CREATED {name}")
        print(f"done: {created} index(es) created")


if __name__ == "__main__":
    main()