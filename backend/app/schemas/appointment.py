"""Appointment schemas."""
from datetime import datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models.enums import AppointmentStatus


class AppointmentCreate(BaseModel):
    service_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    date: str = Field(..., description="Appointment date as YYYY-MM-DD")
    time: str = Field(..., description="Start time as HH:MM")
    duration_minutes: int = 30
    requirements: Optional[List[str]] = None
    notes: Optional[str] = None

    @field_validator("duration_minutes")
    @classmethod
    def _dur(cls, v):
        if v < 5 or v > 480:
            raise ValueError("duration must be between 5 and 480 minutes")
        return v


class AppointmentUpdate(BaseModel):
    service_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    staff_id: Optional[UUID] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration_minutes: Optional[int] = None
    requirements: Optional[List[str]] = None
    notes: Optional[str] = None
    payment_required: Optional[bool] = None
    payment_status: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentOut(BaseModel):
    id: UUID
    appointment_number: str
    customer_id: UUID
    service_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    staff_id: Optional[UUID] = None
    date: datetime
    time: time
    duration_minutes: int
    status: AppointmentStatus
    requirements: Optional[List[str]] = None
    notes: Optional[str] = None
    payment_required: bool
    payment_status: str
    created_at: datetime

    service_name: Optional[str] = None
    branch_name: Optional[str] = None
    customer_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AppointmentSlotCreate(BaseModel):
    branch_id: UUID
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., description="HH:MM")
    end_time: str = Field(..., description="HH:MM")
    is_active: bool = True


class AppointmentSlotOut(BaseModel):
    id: UUID
    branch_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    is_active: bool
    branch_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
