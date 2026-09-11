"""Order number generation and reference helpers."""
from datetime import datetime
import uuid


def generate_order_number() -> str:
    """Generate a unique order number like DP-2026-000001."""
    year = datetime.now().year
    # Use last 6 hex chars of a uuid for uniqueness
    suffix = str(uuid.uuid4().hex)[:6].upper()
    return f"DP-{year}-{suffix}"


def generate_reference(prefix: str) -> str:
    """Generate a payment/transaction reference."""
    return f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"
