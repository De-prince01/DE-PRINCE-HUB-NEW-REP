"""Quotation models: quotation requests, quotes and items."""
import uuid
from datetime import datetime

from sqlalchemy import (Boolean, Column, DateTime, Float, ForeignKey, Integer,
                        JSON, String, Text)
from sqlalchemy import Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class QuotationRequest(Base):
    __tablename__ = "quotation_requests"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_number = Column(String(30), unique=True, nullable=False)
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    service_id = Column(Uuid(as_uuid=True), ForeignKey("services.id"), nullable=False)
    description = Column(Text)
    requirements = Column(JSON)
    files = Column(JSON)  # [{name, url}]
    deadline = Column(DateTime(timezone=True))
    budget = Column(Float)
    status = Column(String(30), default="open")  # open | quoted | accepted | rejected | request_change | cancelled
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    customer = relationship("User")

    @property
    def service_name(self):
        return getattr(self, "_service_name", None)


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_number = Column(String(30), unique=True, nullable=False)
    request_id = Column(Uuid(as_uuid=True), ForeignKey("quotation_requests.id"), nullable=False)
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    note = Column(Text)
    discount = Column(Float, default=0)
    delivery_fee = Column(Float, default=0)
    tax = Column(Float, default=0)
    valid_until = Column(DateTime(timezone=True))
    status = Column(String(30), default="pending")  # pending | accepted | rejected | change_requested | superseded
    subtotal = Column(Float, default=0)
    total = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    items = relationship("QuotationItem", back_populates="quotation")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id = Column(Uuid(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    quotation = relationship("Quotation", back_populates="items")