"""Computer, print, delivery, inventory, expense models (Phase 2)."""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text,
    Enum as SAEnum
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import ComputerStatus, DeliveryType


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Computer(Base):
    __tablename__ = "computers"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(Uuid(as_uuid=True), ForeignKey("branches.id"))
    name = Column(String(50), nullable=False)
    hourly_rate = Column(Float, default=300, nullable=False)
    status = Column(SAEnum(ComputerStatus, name="computer_status"), default=ComputerStatus.AVAILABLE, nullable=False)
    specs = Column(Text)
    notes = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class ComputerSession(Base):
    __tablename__ = "computer_sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    computer_id = Column(Uuid(as_uuid=True), ForeignKey("computers.id"), nullable=False)
    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    customer_name = Column(String(200))
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer, default=0)
    hourly_rate = Column(Float, nullable=False)
    total_amount = Column(Float, default=0)
    is_paid = Column(Boolean, default=False, nullable=False)


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"))
    file_id = Column(Uuid(as_uuid=True), ForeignKey("files.id"))
    file_name = Column(String(500), nullable=False)
    total_pages = Column(Integer, default=1, nullable=False)
    copies = Column(Integer, default=1, nullable=False)
    color_mode = Column(String(20), default="bw")
    paper_size = Column(String(20), default="A4")
    binding_type = Column(String(30))
    lamination = Column(Boolean, default=False)
    status = Column(String(30), default="pending")
    total_amount = Column(Float, default=0, nullable=False)
    is_paid = Column(Boolean, default=False, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True))


class DeliveryZone(Base):
    __tablename__ = "delivery_zones"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    fee = Column(Float, default=0, nullable=False)
    estimated_time = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(Uuid(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    delivery_zone_id = Column(Uuid(as_uuid=True), ForeignKey("delivery_zones.id"))
    delivery_person_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    delivery_type = Column(SAEnum(DeliveryType, name="delivery_type"), nullable=False)
    address = Column(Text)
    fee = Column(Float, default=0)
    status = Column(String(30), default="pending")
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    sku = Column(String(100), unique=True)
    quantity = Column(Integer, default=0, nullable=False)
    unit = Column(String(50), default="piece")
    purchase_price = Column(Float, default=0)
    selling_price = Column(Float, default=0)
    low_stock_threshold = Column(Integer, default=10)
    supplier = Column(String(200))
    is_active = Column(Boolean, default=True, nullable=False)


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_id = Column(Uuid(as_uuid=True), ForeignKey("inventory.id"), nullable=False)
    type = Column(String(20), nullable=False)
    quantity = Column(Integer, nullable=False)
    reference = Column(String(200))
    notes = Column(Text)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    reference = Column(String(200))
    receipt_url = Column(String(500))
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    branch_id = Column(Uuid(as_uuid=True), ForeignKey("branches.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

