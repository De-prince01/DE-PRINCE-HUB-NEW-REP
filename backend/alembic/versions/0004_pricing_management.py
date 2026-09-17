"""Pricing management migration: add admin-editable pricing columns to services.

Adds promotional_price, processing_fee, no_record_price, price_notice and
bookable so pricing/availability are configurable from the admin panel
without changing source code. Idempotent and safe for PostgreSQL + SQLite.
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_pricing_management"
down_revision = "0003_verification"
branch_labels = None
depends_on = None


def column_exists(bind, table_name: str, column_name: str) -> bool:
    insp = sa.inspect(bind)
    try:
        cols = [c["name"] for c in insp.get_columns(table_name)]
    except Exception:
        return False
    return column_name in cols


def upgrade() -> None:
    bind = op.get_bind()

    if not column_exists(bind, "services", "promotional_price"):
        op.add_column("services", sa.Column("promotional_price", sa.Float()))
    if not column_exists(bind, "services", "processing_fee"):
        op.add_column("services", sa.Column("processing_fee", sa.Float()))
    if not column_exists(bind, "services", "no_record_price"):
        op.add_column("services", sa.Column("no_record_price", sa.Float()))
    if not column_exists(bind, "services", "price_notice"):
        op.add_column("services", sa.Column("price_notice", sa.Text()))
    if not column_exists(bind, "services", "bookable"):
        op.add_column(
            "services",
            sa.Column("bookable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        )


def downgrade() -> None:
    for col in ["bookable", "price_notice", "no_record_price", "processing_fee", "promotional_price"]:
        try:
            op.drop_column("services", col)
        except Exception:
            pass