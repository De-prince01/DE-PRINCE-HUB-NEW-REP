"""Phase 66 migration: banks, withdrawal_requests, wallet bank fields.

Creates the banks + withdrawal_requests tables and adds the wallet bank-account
columns. Compatible with both SQLite and PostgreSQL.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_banking"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    def table_exists(table_name: str) -> bool:
        insp = sa.inspect(bind)
        return table_name in insp.get_table_names()

    if not table_exists("banks"):
        banks = op.create_table(
            "banks",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("code", sa.String(10), nullable=False, unique=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("slug", sa.String(255)),
            sa.Column("longcode", sa.String(50)),
            sa.Column("paystack_id", sa.Integer),
            sa.Column("gateway", sa.String(50)),
            sa.Column("type", sa.String(50), server_default="nuban"),
            sa.Column("is_commercial", sa.Boolean, server_default=sa.false()),
            sa.Column("is_microfinance", sa.Boolean, server_default=sa.false()),
            sa.Column("is_active", sa.Boolean, server_default=sa.true()),
            sa.Column("sort_order", sa.Integer, server_default="0"),
            sa.Column("currency", sa.String(10), server_default="NGN"),
            sa.Column("country", sa.String(10), server_default="Nigeria"),
            sa.Column("created_at", sa.DateTime(timezone=True)),
            sa.Column("updated_at", sa.DateTime(timezone=True)),
        )
        op.create_index("idx_banks_name", "banks", ["name"])

    if not table_exists("withdrawal_requests"):
        uid_type = sa.Uuid(as_uuid=True) if dialect != "sqlite" else sa.String(36)
        op.create_table(
            "withdrawal_requests",
            sa.Column("id", uid_type, primary_key=True),
            sa.Column("reference", sa.String(100), nullable=False, unique=True),
            sa.Column("user_id", uid_type, sa.ForeignKey("users.id"), nullable=False),
            sa.Column("amount", sa.Float, nullable=False),
            sa.Column("bank_code", sa.String(10), nullable=False),
            sa.Column("account_number", sa.String(20), nullable=False),
            sa.Column("account_name", sa.String(255)),
            sa.Column("status", sa.String(20), server_default="pending"),
            sa.Column("gateway", sa.String(50)),
            sa.Column("transfer_reference", sa.String(200)),
            sa.Column("admin_note", sa.Text),
            sa.Column("approved_by", uid_type, sa.ForeignKey("users.id")),
            sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("processed_at", sa.DateTime(timezone=True)),
            sa.Column("completed_at", sa.DateTime(timezone=True)),
        )
        op.create_index("idx_withdrawal_user", "withdrawal_requests", ["user_id"])
        op.create_index("idx_withdrawal_status", "withdrawal_requests", ["status"])

    # Wallet bank-account columns (SQLite requires separate ALTER TABLE).
    # Column-level guard because 001_init.sql may already define them.
    cols = {
        "bank_code": sa.Column("bank_code", sa.String(10)),
        "account_number": sa.Column("account_number", sa.String(20)),
        "account_name": sa.Column("account_name", sa.String(255)),
        "account_verified": sa.Column("account_verified", sa.Boolean, server_default=sa.false()),
    }
    existing = {row["name"] for row in bind.get_columns("wallets")}
    for name, col in cols.items():
        if name in existing:
            continue
        op.add_column("wallets", col)


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_index("idx_withdrawal_user", table_name="withdrawal_requests")
    op.drop_index("idx_withdrawal_status", table_name="withdrawal_requests")
    op.drop_index("idx_banks_name", table_name="banks")
    if bind.dialect.name != "sqlite":
        op.drop_column("wallets", "account_verified")
        op.drop_column("wallets", "account_name")
        op.drop_column("wallets", "account_number")
        op.drop_column("wallets", "bank_code")
    op.drop_table("withdrawal_requests")
    op.drop_table("banks")