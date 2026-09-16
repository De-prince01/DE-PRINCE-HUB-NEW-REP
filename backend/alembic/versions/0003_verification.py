"""Verification Centre migration: verification_requests + verification_providers.

Creates the customer-facing verification tables. Compatible with PostgreSQL
(production, UUID/JSON) and SQLite (local dev fallbacks).
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_verification"
down_revision = "0002_banking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    def table_exists(table_name: str) -> bool:
        insp = sa.inspect(bind)
        return table_name in insp.get_table_names()

    if not table_exists("verification_requests"):
        op.create_table(
            "verification_requests",
            sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("reference", sa.String(50), nullable=False, unique=True),
            sa.Column("customer_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id")),
            sa.Column("verification_type", sa.String(50), nullable=False),
            sa.Column("entity_name", sa.String(300)),
            sa.Column("id_number", sa.String(100)),
            sa.Column("id_number_encrypted", sa.String(500)),
            sa.Column("file_id", sa.Uuid(), sa.ForeignKey("files.id")),
            sa.Column("status", sa.String(30), nullable=False, server_default="submitted"),
            sa.Column("status_message", sa.Text()),
            sa.Column("provider", sa.String(100)),
            sa.Column("provider_reference", sa.String(200)),
            sa.Column("result", sa.JSON()),
            sa.Column("service_id", sa.Uuid(), sa.ForeignKey("services.id")),
            sa.Column("amount", sa.Float(), server_default="0"),
            sa.Column("is_paid", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.text("now()")),
            sa.Column("completed_at", sa.DateTime(timezone=True)),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.Column("expires_at", sa.DateTime(timezone=True)),
        )
        op.create_index("ix_verification_requests_reference", "verification_requests", ["reference"])
        op.create_index("ix_verification_requests_customer_id", "verification_requests", ["customer_id"])

    if not table_exists("verification_providers"):
        op.create_table(
            "verification_providers",
            sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("name", sa.String(100), nullable=False, unique=True),
            sa.Column("display_name", sa.String(200), nullable=False),
            sa.Column("provider_class", sa.String(200), nullable=False),
            sa.Column("supports_types", sa.JSON(), server_default="[]"),
            sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("requires_secret", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("base_url", sa.String(500)),
            sa.Column("docs_url", sa.String(500)),
            sa.Column("notes", sa.Text()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        )


def downgrade() -> None:
    op.drop_index("ix_verification_requests_customer_id", "verification_requests")
    op.drop_index("ix_verification_requests_reference", "verification_requests")
    op.drop_table("verification_requests")
    op.drop_table("verification_providers")