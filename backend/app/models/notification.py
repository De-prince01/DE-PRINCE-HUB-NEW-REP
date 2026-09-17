"""Notification, rating, receipt, audit log, identity records, settings models."""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text,
    Enum as SAEnum, LargeBinary
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import PaymentMethod, NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(SAEnum(NotificationType, name="notification_type", values_callable=lambda c: [e.value for e in c]), default=NotificationType.SYSTEM, nullable=False)
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, default=dict)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    worker_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False)
    review = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_number = Column(String(50), unique=True, nullable=False)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"))
    transaction_id = Column(Uuid(as_uuid=True), ForeignKey("transactions.id"))
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, default=0)
    total = Column(Float, nullable=False)
    payment_method = Column(SAEnum(PaymentMethod, name="payment_method", values_callable=lambda c: [e.value for e in c]))
    qr_data = Column(Text)
    issued_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(Uuid(as_uuid=True))
    old_values = Column(JSON)
    new_values = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class IdentityServiceRecord(Base):
    __tablename__ = "identity_service_records"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"))
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    service_type = Column(String(100), nullable=False)
    provider = Column(String(100))
    data_encrypted = Column(LargeBinary)
    access_log = Column(JSON, default=list)
    retention_days = Column(Integer, default=30)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(200), primary_key=True)
    value = Column(JSON, nullable=False)
    category = Column(String(100), default="general")
    description = Column(Text)
    updated_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CommissionRule(Base):
    __tablename__ = "commission_rules"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_category_id = Column(Uuid(as_uuid=True), ForeignKey("service_categories.id"))
    worker_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    rule_type = Column(String(20), default="percentage", nullable=False)
    value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

