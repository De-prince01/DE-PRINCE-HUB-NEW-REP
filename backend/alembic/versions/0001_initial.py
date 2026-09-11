"""Initial database migration using the SQL schema.

Since the full normalized schema is provided as a direct SQL script
(database/001_init.sql) for clarity and control, this Alembic migration
executes that script for environments that run migrations via Alembic.

    In production you may prefer pure Alembic autogenerate; see docs.
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Read and execute the canonical SQL schema file. Tolerates both the
    # source tree layout (<repo>/database/001_init.sql) and the container
    # layout (/app/database/001_init.sql).
    from pathlib import Path
    here = Path(__file__).resolve()
    candidates = [
        here.parents[2] / "database" / "001_init.sql",      # /app/database
        here.parents[1].parent / "database" / "001_init.sql",  # repo backend/database
    ]
    sql_path = next((p for p in candidates if p.exists()), None)
    if sql_path is None:
        raise RuntimeError("001_init.sql not found — cannot run initial migration")
    if sql_path.exists():
        sql = sql_path.read_text()
        # Split on statement boundaries is fragile; instead execute whole file.
        # pg works with multiple statements in one execute (via psycopg tendency),
        # but SQLAlchemy's execute may not. Fall back to raw connection if needed.
        conn = op.get_bind()
        try:
            conn.execute(sa.text(sql))
        except Exception:
            # Execute statement by statement (naive split on ';' respecting strings is hard)
            stmts = [s.strip() for s in sql.split(";") if s.strip()]
            for stmt in stmts:
                try:
                    conn.execute(sa.text(stmt))
                except Exception:
                    pass


def downgrade() -> None:
    # Drop all tables in reverse dependency order
    tables = [
        "withdrawal_requests", "banks",
        "audit_logs", "identity_service_records", "receipts", "ratings",
        "notifications", "commission_rules", "settings",
        "expenses", "inventory_transactions", "inventory",
        "deliveries", "delivery_zones", "print_jobs",
        "computer_sessions", "computers",
        "appointment_slots", "appointments",
        "commissions", "payments", "transactions", "wallets",
        "wallet_transactions", "files", "order_messages",
        "order_status_history", "order_items", "orders",
        "worker_profiles", "customer_profiles", "services",
        "service_categories", "branches", "users",
    ]
    op.execute("DROP TABLE IF EXISTS " + ", ".join(tables) + " CASCADE")
    try:
        op.execute("DROP TYPE IF EXISTS withdrawal_status")
    except Exception:
        pass
