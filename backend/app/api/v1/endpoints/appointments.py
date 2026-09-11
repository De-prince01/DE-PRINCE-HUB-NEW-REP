"""Appointment endpoints (Phase 9).

Customers book appointments for services that require them; admin / staff confirm,
check-in, mark in-service/completed, or cancel/reschedule.
"""
from datetime import datetime, time as dt_time
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user, require_roles
from app.models.appointment import Appointment, AppointmentSlot
from app.models.service import Service
from app.models.cybercafe import Branch
from app.models.user import User
from app.models.enums import AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate, AppointmentUpdate, AppointmentStatusUpdate,
    AppointmentOut, AppointmentSlotCreate, AppointmentSlotOut,
)
from app.services.order_number import generate_reference
from app.services.audit import log_action

router = APIRouter(prefix="/appointments", tags=["appointments"])


async def _parse_date(value: str, field: str) -> datetime:
    """Parse a date string (YYYY-MM-DD) or datetime into a datetime."""
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        pass
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{field} must be YYYY-MM-DD")


async def _parse_time(value: str, field: str = "time") -> dt_time:
    try:
        return dt_time.fromisoformat(value if ":" in value else value + ":00")
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{field} must be HH:MM")


async def _decorate(appointment: Appointment, db: AsyncSession) -> AppointmentOut:
    out = AppointmentOut.model_validate(appointment)
    if appointment.service_id:
        svc = await db.execute(select(Service.name).where(Service.id == appointment.service_id))
        out.service_name = svc.scalar_one_or_none()
    if appointment.branch_id:
        br = await db.execute(select(Branch.name).where(Branch.id == appointment.branch_id))
        out.branch_name = br.scalar_one_or_none()
    if appointment.customer_id:
        cu = await db.execute(select(User.first_name, User.last_name).where(User.id == appointment.customer_id))
        row = cu.first()
        if row:
            out.customer_name = f"{row[0]} {row[1]}".strip()
    return out


async def _get_for_user(appointment_id: UUID, current_user: User, db: AsyncSession) -> Appointment:
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    is_staff = current_user.role not in ("customer",)
    if appt.customer_id != current_user.id and not is_staff:
        raise HTTPException(status_code=403, detail="Not your appointment")
    return appt


@router.get("", response_model=List[AppointmentOut])
async def list_appointments(
    status: Optional[AppointmentStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_staff = current_user.role != "customer"
    query = select(Appointment)
    if not is_staff:
        query = query.where(Appointment.customer_id == current_user.id)
    elif status:
        query = query.where(Appointment.status == status)
    query = query.order_by(Appointment.date.desc())
    result = await db.execute(query)
    return [(await _decorate(a, db)) for a in result.scalars().all()]


@router.post("", response_model=AppointmentOut, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appt_date = await _parse_date(data.date, "date")
    appt_time = await _parse_time(data.time)

    if data.service_id:
        svc = await db.execute(select(Service).where(Service.id == data.service_id))
        if not svc.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid service")
    if data.branch_id:
        br = await db.execute(select(Branch).where(Branch.id == data.branch_id))
        if not br.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid branch")

    appointment = Appointment(
        appointment_number=generate_reference("APT"),
        customer_id=current_user.id,
        service_id=data.service_id,
        branch_id=data.branch_id,
        date=appt_date,
        time=appt_time,
        duration_minutes=data.duration_minutes,
        requirements=data.requirements,
        notes=data.notes,
    )
    db.add(appointment)
    await log_action(db, "appointment_created", current_user.id, "appointments", appointment.id,
                     new_values={"service_id": data.service_id, "date": data.date, "time": data.time})
    await db.commit()
    await db.refresh(appointment)
    return await _decorate(appointment, db)


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appt = await _get_for_user(appointment_id, current_user, db)
    return await _decorate(appt, db)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: UUID,
    data: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appt = await _get_for_user(appointment_id, current_user, db)
    updates = data.model_dump(exclude_unset=True)
    if "date" in updates and updates["date"]:
        appt.date = await _parse_date(updates["date"], "date")
    if "time" in updates and updates["time"]:
        appt.time = await _parse_time(updates["time"])
    if "service_id" in updates:
        svc = await db.execute(select(Service).where(Service.id == updates["service_id"]))
        if not svc.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid service")
        appt.service_id = updates["service_id"]
    if "branch_id" in updates:
        br = await db.execute(select(Branch).where(Branch.id == updates["branch_id"]))
        if not br.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid branch")
        appt.branch_id = updates["branch_id"]
    for f in ("staff_id", "duration_minutes", "requirements", "notes", "payment_required", "payment_status"):
        if f in updates:
            setattr(appt, f, updates[f])
    await log_action(db, "appointment_updated", current_user.id, "appointments", appt.id,
                     new_values=updates)
    await db.commit()
    await db.refresh(appt)
    return await _decorate(appt, db)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentOut)
async def cancel_appointment(
    appointment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    appt = await _get_for_user(appointment_id, current_user, db)
    if appt.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.MISSED):
        raise HTTPException(status_code=400, detail=f"Cannot cancel an appointment that is {appt.status.value}")
    old = appt.status.value
    appt.status = AppointmentStatus.CANCELLED
    await log_action(db, "appointment_cancelled", current_user.id, "appointments", appt.id,
                     old_values={"status": old}, new_values={"status": "cancelled"})
    await db.commit()
    await db.refresh(appt)
    return await _decorate(appt, db)


@router.patch("/{appointment_id}/status", response_model=AppointmentOut, dependencies=[Depends(require_admin)])
async def update_appointment_status(
    appointment_id: UUID,
    data: AppointmentStatusUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    old = appt.status.value
    appt.status = data.status
    await log_action(db, "appointment_status", current_user.id, "appointments", appt.id,
                     old_values={"status": old}, new_values={"status": data.status.value})
    await db.commit()
    await db.refresh(appt)
    return await _decorate(appt, db)


# ---------------------------------------------------------------------------
# Appointment slots (admin-configurable availability)
# ---------------------------------------------------------------------------

@router.get("/slots/available", response_model=List[AppointmentSlotOut])
async def list_available_slots(
    branch_id: Optional[UUID] = None,
    day_of_week: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(AppointmentSlot).where(AppointmentSlot.is_active == True)
    if branch_id:
        query = query.where(AppointmentSlot.branch_id == branch_id)
    if day_of_week is not None:
        query = query.where(AppointmentSlot.day_of_week == day_of_week)
    result = await db.execute(query.order_by(AppointmentSlot.day_of_week, AppointmentSlot.start_time))
    slots = []
    for s in result.scalars().all():
        br = await db.execute(select(Branch.name).where(Branch.id == s.branch_id))
        out = AppointmentSlotOut.model_validate(s)
        out.branch_name = br.scalar_one_or_none()
        slots.append(out)
    return slots


@router.post("/slots", response_model=AppointmentSlotOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_slot(
    data: AppointmentSlotCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    br = await db.execute(select(Branch).where(Branch.id == data.branch_id))
    if not br.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid branch")
    slot = AppointmentSlot(
        branch_id=data.branch_id,
        day_of_week=data.day_of_week,
        start_time=await _parse_time(data.start_time, "start_time"),
        end_time=await _parse_time(data.end_time, "end_time"),
        is_active=data.is_active,
    )
    db.add(slot)
    await log_action(db, "slot_created", current_user.id, "appointment_slots", slot.id, new_values=data.model_dump())
    await db.commit()
    await db.refresh(slot)
    out = AppointmentSlotOut.model_validate(slot)
    out.branch_name = (await db.execute(select(Branch.name).where(Branch.id == slot.branch_id))).scalar_one_or_none()
    return out
