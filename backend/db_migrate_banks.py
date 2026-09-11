"""Phase 66 migration: banks, withdrawal_requests, wallet bank fields.

Creates the tables and adds wallet columns if missing, then seeds the bank
catalogue (commercial + microfinance). Idempotent — safe to re-run.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings

settings = get_settings()
url = settings.database_url
if url.startswith("sqlite+aiosqlite:///"):
    url = "sqlite:///" + url[len("sqlite+aiosqlite:///"):]

engine = create_engine(url, pool_pre_ping=True)


DDL = {
    "banks": """
        CREATE TABLE IF NOT EXISTS banks (
            id INTEGER PRIMARY KEY,
            code VARCHAR(10) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255),
            longcode VARCHAR(50),
            paystack_id INTEGER,
            gateway VARCHAR(50),
            type VARCHAR(50) DEFAULT 'nuban',
            is_commercial BOOLEAN DEFAULT 0,
            is_microfinance BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            currency VARCHAR(10) DEFAULT 'NGN',
            country VARCHAR(10) DEFAULT 'Nigeria',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """,
    "withdrawal_requests": """
        CREATE TABLE IF NOT EXISTS withdrawal_requests (
            id VARCHAR(36) PRIMARY KEY,
            reference VARCHAR(100) NOT NULL UNIQUE,
            user_id VARCHAR(36) NOT NULL,
            amount FLOAT NOT NULL,
            bank_code VARCHAR(10) NOT NULL,
            account_number VARCHAR(20) NOT NULL,
            account_name VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending',
            gateway VARCHAR(50),
            transfer_reference VARCHAR(200),
            admin_note TEXT,
            approved_by VARCHAR(36),
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            completed_at TIMESTAMP
        )
    """,
    "idx_withdrawal_user": """
        CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id)
    """,
    "idx_withdrawal_status": """
        CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status)
    """,
    "idx_banks_name": """
        CREATE INDEX IF NOT EXISTS idx_banks_name ON banks(name)
    """,
}

WALLET_COLUMNS = [
    ("bank_code", "VARCHAR(10)"),
    ("account_number", "VARCHAR(20)"),
    ("account_name", "VARCHAR(255)"),
    ("account_verified", "BOOLEAN DEFAULT 0"),
]


def main():
    with engine.begin() as conn:
        for name, ddl in DDL.items():
            conn.execute(text(ddl))
            print(f"OK {name}")

        col_rows = conn.execute(text("PRAGMA table_info(wallets)")).fetchall()
        existing = {row[1] for row in col_rows}
        for col, dtype in WALLET_COLUMNS:
            if col in existing:
                print(f"SKIP wallet.{col} (exists)")
                continue
            conn.execute(text(f"ALTER TABLE wallets ADD COLUMN {col} {dtype}"))
            print(f"ADDED wallets.{col}")
    print("schema migration complete")


if __name__ == "__main__":
    main()