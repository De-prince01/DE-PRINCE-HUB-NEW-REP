"""Wallet, transaction, payment, commission models."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, JSON, Enum as SAEnum
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import PaymentStatus, PaymentMethod


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Float, default=0, nullable=False)
    bank_code = Column(String(10))
    account_number = Column(String(20))
    account_name = Column(String(255))
    account_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="wallet")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    # Kept minimal; full ledger lives in transactions table.
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(Uuid(as_uuid=True), ForeignKey("wallets.id"), nullable=False)
    type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    reference = Column(String(100), unique=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference = Column(String(100), unique=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"))
    type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(SAEnum(PaymentStatus, name="payment_status", values_callable=lambda c: [e.value for e in c]), default=PaymentStatus.PENDING, nullable=False)
    payment_method = Column(SAEnum(PaymentMethod, name="payment_method", values_callable=lambda c: [e.value for e in c]))
    gateway = Column(String(50))
    gateway_reference = Column(String(200))
    meta = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True))


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(Uuid(as_uuid=True), ForeignKey("transactions.id"), nullable=False)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"))
    amount = Column(Float, nullable=False)
    status = Column(SAEnum(PaymentStatus, name="payment_status", values_callable=lambda c: [e.value for e in c]), default=PaymentStatus.PENDING, nullable=False)
    payment_method = Column(SAEnum(PaymentMethod, name="payment_method", values_callable=lambda c: [e.value for e in c]), nullable=False)
    gateway = Column(String(50))
    gateway_response = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True))

    order = relationship("Order", back_populates="payments")


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    worker_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    commission_amount = Column(Float, nullable=False)
    worker_amount = Column(Float, nullable=False)
    commission_rate = Column(Float, nullable=False)
    is_paid = Column(Boolean, default=False, nullable=False)
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

