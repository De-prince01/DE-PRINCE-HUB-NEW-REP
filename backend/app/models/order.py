"""Order models: orders, order items, status history, messages."""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text,
    Enum as SAEnum
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import OrderStatus, DeliveryType


class Order(Base):
    __tablename__ = "orders"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(30), unique=True, nullable=False)
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    worker_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    branch_id = Column(Uuid(as_uuid=True), ForeignKey("branches.id"))
    status = Column(SAEnum(OrderStatus, name="order_status", values_callable=lambda c: [e.value for e in c]), default=OrderStatus.PENDING, nullable=False)
    subtotal = Column(Float, default=0, nullable=False)
    delivery_fee = Column(Float, default=0)
    tax = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, default=0, nullable=False)
    delivery_type = Column(SAEnum(DeliveryType, name="delivery_type", values_callable=lambda c: [e.value for e in c]), default=DeliveryType.PICKUP)
    delivery_address = Column(Text)
    deadline = Column(DateTime(timezone=True))
    customer_notes = Column(Text)
    internal_notes = Column(Text)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime(timezone=True))

    items = relationship("OrderItem", back_populates="order")
    status_history = relationship("OrderStatusHistory", back_populates="order")
    messages = relationship("OrderMessage", back_populates="order")
    files = relationship("File", back_populates="order")
    payments = relationship("Payment", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(Uuid(as_uuid=True), ForeignKey("services.id"), nullable=False)
    service_name = Column(String(300), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    custom_options = Column(JSON, default=dict)

    order = relationship("Order", back_populates="items")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    from_status = Column(SAEnum(OrderStatus, name="order_status", values_callable=lambda c: [e.value for e in c]))
    to_status = Column(SAEnum(OrderStatus, name="order_status", values_callable=lambda c: [e.value for e in c]), nullable=False)
    changed_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="status_history")


class OrderMessage(Base):
    __tablename__ = "order_messages"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    file_url = Column(String(500))
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="messages")

