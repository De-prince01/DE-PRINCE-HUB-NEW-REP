"""Customer and worker profile models."""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String(200))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="customer_profile")


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    specialties = Column(JSON)
    bio = Column(Text)
    commission_rate = Column(Float, default=20.00)
    total_earnings = Column(Float, default=0)
    total_jobs = Column(Integer, default=0)
    average_rating = Column(Float, default=0)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="worker_profile")

