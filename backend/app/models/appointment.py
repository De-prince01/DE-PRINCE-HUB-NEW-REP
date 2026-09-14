"""Appointment models (Phase 9).

Supports services that require an appointment (see Service.requires_appointment):
booking, confirmation, reminders, check-in, in-service, completion, plus
cancellation / reschedule. Each appointment may optionally be tied to a service,
branch, and a staff member.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, Integer, String, Text, Boolean, ForeignKey,
    Enum as SAEnum, Time,
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import AppointmentStatus


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_number = Column(String(40), unique=True, nullable=False)

    customer_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    service_id = Column(Uuid(as_uuid=True), ForeignKey("services.id"))
    branch_id = Column(Uuid(as_uuid=True), ForeignKey("branches.id"))
    staff_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))

    date = Column(DateTime(timezone=True), nullable=False)   # appointment day (date part used)
    time = Column(Time, nullable=False)                       # start time
    duration_minutes = Column(Integer, default=30, nullable=False)

    status = Column(
        SAEnum(AppointmentStatus, name="appointment_status", values_callable=lambda c: [e.value for e in c]),
        default=AppointmentStatus.REQUESTED,
        nullable=False,
    )
    requirements = Column(JSON)
    notes = Column(Text)

    payment_required = Column(Boolean, default=False, nullable=False)
    payment_status = Column(String(20), default="pending")    # pending | paid

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("User", foreign_keys=[customer_id])
    service = relationship("Service", foreign_keys=[service_id])
    branch = relationship("Branch", foreign_keys=[branch_id])
    staff = relationship("User", foreign_keys=[staff_id])


class AppointmentSlot(Base):
    """Admin-configurable appointment availability for a branch."""
    __tablename__ = "appointment_slots"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(Uuid(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)             # 0=Mon ... 6=Sun
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    branch = relationship("Branch", foreign_keys=[branch_id])
