"""Bank and withdrawal models."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, Enum as SAEnum
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import WithdrawalStatus


class Bank(Base):
    __tablename__ = "banks"

    id = Column(Integer, primary_key=True)
    code = Column(String(10), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), index=True)
    longcode = Column(String(50))
    paystack_id = Column(Integer)
    gateway = Column(String(50))
    type = Column(String(50), default="nuban")
    is_commercial = Column(Boolean, default=False)
    is_microfinance = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0)
    currency = Column(String(10), default="NGN")
    country = Column(String(10), default="Nigeria")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference = Column(String(100), unique=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    bank_code = Column(String(10), nullable=False)
    account_number = Column(String(20), nullable=False)
    account_name = Column(String(255))
    status = Column(SAEnum(WithdrawalStatus, name="withdrawal_status"), default=WithdrawalStatus.PENDING, nullable=False)
    gateway = Column(String(50))
    transfer_reference = Column(String(200))
    admin_note = Column(Text)
    approved_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    requested_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    user = relationship("User", foreign_keys=[user_id], backref="withdrawal_requests")
    approver = relationship("User", foreign_keys=[approved_by])