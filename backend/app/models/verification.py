"""Verification Centre models.

Customer-facing verification requests (NIN, BVN, CAC, academic documents,
bank accounts, businesses) with an honest status lifecycle and a generated
reference code (DP-VER-XXXXXXXX). Verification results are ONLY ever written
by staff through the configured provider pipeline — nothing is faked here.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, String, Text, Boolean, Integer, Float, ForeignKey,
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference = Column(String(50), unique=True, index=True, nullable=False)

    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"))

    # What is being verified: nin | bvn | cac | bank | academic | document | other
    verification_type = Column(String(50), nullable=False)
    entity_name = Column(String(300))          # person/business/document label
    id_number = Column(String(100))            # the value to verify (masked in responses)
    id_number_encrypted = Column(String(500))  # encrypted value (if provider pipeline off, still kept private)
    file_id = Column(Uuid(as_uuid=True), ForeignKey("files.id"))

    # Honest status lifecycle:
    # submitted -> under_review -> processing -> completed | failed | cancelled
    status = Column(String(30), default="submitted", nullable=False)
    status_message = Column(Text)

    provider = Column(String(100))             # which provider handled it (set by staff)
    provider_reference = Column(String(200))   # provider-side reference when available
    result = Column(JSON)                      # result payload written ONLY on completion

    # Pricing (mirrors the service engine; configurable, never hard-coded at runtime)
    service_id = Column(Uuid(as_uuid=True), ForeignKey("services.id"))
    amount = Column(Float, default=0)

    is_paid = Column(Boolean, default=False, nullable=False)

    requested_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True))  # e.g. 90 days after completion

    customer = relationship("User", foreign_keys=[customer_id])
    service = relationship("Service")

    def to_dict(self, include_pii: bool = False) -> dict:
        return {
            "id": str(self.id),
            "reference": self.reference,
            "customer_id": str(self.customer_id),
            "order_id": str(self.order_id) if self.order_id else None,
            "verification_type": self.verification_type,
            "entity_name": self.entity_name,
            "id_number": self.id_number if include_pii else None,
            "status": self.status,
            "status_message": self.status_message,
            "provider": self.provider,
            "amount": self.amount,
            "is_paid": self.is_paid,
            "result": self.result,
            "requested_at": self.requested_at,
            "completed_at": self.completed_at,
        }


class VerificationProviderConfig(Base):
    """Runtime-configurable provider registry.

    Providers are enabled only when their secret keys are present in settings.
    This table is a human-friendly index over the code-level provider
    abstraction (app/services/identity.py) so admins can flip providers on/off
    from the dashboard without a redeploy.
    """
    __tablename__ = "verification_providers"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), nullable=False)
    provider_class = Column(String(200), nullable=False)
    supports_types = Column(JSON, default=list)   # ["nin", "bvn", "cac", ...]
    is_enabled = Column(Boolean, default=False, nullable=False)
    requires_secret = Column(Boolean, default=True, nullable=False)
    base_url = Column(String(500))
    docs_url = Column(String(500))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)