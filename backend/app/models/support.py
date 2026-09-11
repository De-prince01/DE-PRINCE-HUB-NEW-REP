"""Support centre models: tickets, ticket messages, FAQ (spec §57)."""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, String, Text, Uuid,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class SupportTicket(Base):
    """A customer support ticket (question, dispute, refund request, escalation)."""

    __tablename__ = "support_tickets"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String(30), unique=True, nullable=False)   # TK-XXXXXX
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"))
    subject = Column(String(200), nullable=False)
    category = Column(String(30), default="general", nullable=False)  # general | order_dispute | refund_request | escalation
    priority = Column(String(10), default="medium", nullable=False)   # low | medium | high
    status = Column(String(20), default="open", nullable=False)       # open | in_progress | waiting_customer | resolved | closed
    description = Column(Text, nullable=False)
    is_escalated = Column(Boolean, default=False, nullable=False)
    escalation_reason = Column(Text)
    refund_decision = Column(String(10))                              # approved | denied
    refund_amount = Column(Float)
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("User", foreign_keys=[customer_id])
    messages = relationship(
        "SupportMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="SupportMessage.created_at",
    )


class SupportMessage(Base):
    """A message on a support ticket (customer or agent)."""

    __tablename__ = "support_messages"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(Uuid(as_uuid=True), ForeignKey("support_tickets.id"), nullable=False)
    sender_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sender_role = Column(String(10), default="customer", nullable=False)  # customer | staff
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    ticket = relationship("SupportTicket", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class FAQ(Base):
    """A frequently-asked question shown in the support centre."""

    __tablename__ = "support_faqs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question = Column(String(300), nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(50), default="general")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)