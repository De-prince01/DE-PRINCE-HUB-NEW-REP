"""Subscription models: plans, subscriptions, renewals.

Implements the recurring-revenue architecture (spec §36) — subscribable
plans (website maintenance, IT support, hosting, etc.), customer subscriptions
across monthly/quarterly/yearly billing cycles, and renewal/payment/expiration
tracking.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text,
    Enum as SAEnum,
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import BillingCycle, SubscriptionStatus, PaymentStatus


class SubscriptionPlan(Base):
    """A configurable recurring plan a customer can subscribe to."""

    __tablename__ = "subscription_plans"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, nullable=False)
    service_id = Column(Uuid(as_uuid=True), ForeignKey("services.id"))
    icon = Column(String(100))
    description = Column(Text)
    billing_cycle = Column(SAEnum(BillingCycle, name="billing_cycle"), default=BillingCycle.MONTHLY, nullable=False)
    amount = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_number = Column(String(30), unique=True, nullable=False)
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan_id = Column(Uuid(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    amount = Column(Float, nullable=False, default=0)
    billing_cycle = Column(SAEnum(BillingCycle, name="billing_cycle"), default=BillingCycle.MONTHLY, nullable=False)
    status = Column(SAEnum(SubscriptionStatus, name="subscription_status"), default=SubscriptionStatus.ACTIVE, nullable=False)
    service_status = Column(String(30), default="active")  # active | provisioning | active | suspended
    start_date = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    next_billing_date = Column(DateTime(timezone=True), nullable=False)
    last_billed_at = Column(DateTime(timezone=True))
    auto_renew = Column(Boolean, default=True, nullable=False)
    renewal_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    plan = relationship("SubscriptionPlan")
    renewals = relationship("SubscriptionRenewal", back_populates="subscription")


class SubscriptionRenewal(Base):
    """A single billing cycle for a subscription (renewal / payment)."""

    __tablename__ = "subscription_renewals"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(Uuid(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    cycle_start = Column(DateTime(timezone=True), nullable=False)
    cycle_end = Column(DateTime(timezone=True), nullable=False)
    amount = Column(Float, nullable=False, default=0)
    status = Column(SAEnum(PaymentStatus, name="payment_status"), default=PaymentStatus.PENDING, nullable=False)
    payment_method = Column(String(30))
    transaction_ref = Column(String(120))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    subscription = relationship("Subscription", back_populates="renewals")
