"""Referral models: program config, codes, signups, rewards.

Implements the referral programme (spec §31):
  - Each customer receives a referral code (e.g. DP-PRINCE-ABC123).
  - When a referred customer completes an eligible order, the referrer earns a
    configurable reward (percentage or fixed, with minimum order / maximum reward /
    eligible services controls).
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class ReferralProgram(Base):
    """Single-row config for the referral programme."""

    __tablename__ = "referral_program"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_active = Column(Boolean, default=False, nullable=False)
    reward_type = Column(String(20), default="fixed")     # percentage | fixed
    reward_value = Column(Float, default=200.0)           # % or fixed amount
    minimum_order_amount = Column(Float, default=0.0)
    maximum_reward = Column(Float)                        # None = unlimited
    eligible_service_ids = Column(JSON, default=list)     # [] = all services
    updated_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class ReferralCode(Base):
    """A customer's unique referral code."""

    __tablename__ = "referral_codes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    code = Column(String(40), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ReferralSignup(Base):
    """A referred join: referred_user was brought in by referrer via code."""

    __tablename__ = "referral_signups"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    referred_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    code = Column(String(40), nullable=False)
    referred_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ReferralReward(Base):
    """A reward earned by a referrer when a referred customer's order is eligible."""

    __tablename__ = "referral_rewards"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    referrer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    referred_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"), nullable=False, unique=True)
    amount = Column(Float, nullable=False, default=0)
    reward_type = Column(String(20), nullable=False, default="fixed")
    status = Column(String(20), default="earned", nullable=False)  # earned | paid
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    referrer = relationship("User", foreign_keys=[referrer_id])