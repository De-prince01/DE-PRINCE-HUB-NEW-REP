"""Privacy helpers: masking and data export (spec §59)."""
from typing import Any


def mask(value: Any, keep: int = 4) -> str:
    """Mask a sensitive string like an ID number, keeping only the last `keep` chars."""
    s = str(value or "")
    if not s:
        return ""
    if len(s) <= keep:
        return "*" * len(s)
    return "*" * (len(s) - keep) + s[-keep:]


def mask_email(email: str) -> str:
    s = str(email or "")
    if "@" not in s:
        return mask(s)
    local, _, domain = s.partition("@")
    if len(local) <= 2:
        return "*" * len(local) + "@" + domain
    return local[0] + "*" * (len(local) - 2) + local[-1] + "@" + domain


DEFAULT_PURPOSES = [
    {
        "purpose_code": "service_fulfillment",
        "title": "Fulfilling your services",
        "description": "We need your contact and order details to carry out the services you request (printing, identity help, delivery, etc.).",
        "data_collected": ["Name", "Email", "Phone", "Order / appointment details"],
        "retention_days": 365,
        "is_required": True,
    },
    {
        "purpose_code": "payment_processing",
        "title": "Payment and receipts",
        "description": "We record payments, wallet credits and receipts so we can bill you and confirm purchases.",
        "data_collected": ["Payment records", "Transaction references", "Receipts"],
        "retention_days": 730,
        "is_required": True,
    },
    {
        "purpose_code": "identity_verification",
        "title": "Official identity verification",
        "description": "For official services (NIN, BVN, SNIN) we verify your document with the provider and keep an encrypted audit trail. Only masked numbers are ever shown.",
        "data_collected": ["Verification type", "Encrypted reference", "Provider result"],
        "retention_days": 30,
        "is_required": True,
    },
    {
        "purpose_code": "support_tickets",
        "title": "Support and disputes",
        "description": "We keep your support conversations so we can handle disputes, refunds and escalations.",
        "data_collected": ["Ticket messages", "Attachments"],
        "retention_days": 180,
        "is_required": False,
    },
    {
        "purpose_code": "marketing",
        "title": "News and promotions",
        "description": "Only if you opt in, we use your email to send useful offers and news. You can revoke this at any time.",
        "data_collected": ["Email"],
        "retention_days": 180,
        "is_required": False,
    },
    {
        "purpose_code": "analytics",
        "title": "Improving the platform",
        "description": "Aggregated, de-identified usage data helps us improve our services. It never identifies you personally.",
        "data_collected": ["Aggregated usage statistics"],
        "retention_days": 365,
        "is_required": False,
    },
]


async def ensure_default_purposes(db) -> None:
    """Insert the default privacy purpose registry when empty (idempotent)."""
    from sqlalchemy import select, func
    from app.models.privacy import DataPurpose

    count = (await db.execute(select(func.count()).select_from(DataPurpose))).scalar() or 0
    if count:
        return
    for p in DEFAULT_PURPOSES:
        db.add(DataPurpose(**p))
    await db.flush()
    await db.commit()