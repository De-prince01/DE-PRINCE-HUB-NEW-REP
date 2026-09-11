"""Worker / partner marketplace endpoints."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.profile import WorkerProfile
from app.models.order import Order
from app.models.enums import UserRole, OrderStatus
from app.services.audit import log_action

router = APIRouter(prefix="/workers", tags=["workers"])

WORKER_ROLES = [
    UserRole.PRINTING_OPERATOR, UserRole.GRAPHIC_DESIGNER, UserRole.WEB_DEVELOPER,
    UserRole.ACADEMIC_SERVICE_WORKER, UserRole.TECHNICIAN, UserRole.DELIVERY_PERSON,
    UserRole.PARTNER_FREELANCER,
]
WORKER_ROLE_SET = {r.value for r in WORKER_ROLES}


def _profile_out(user, profile):
    return {
        "id": str(user.id),
        "name": user.full_name,
        "role": user.role,
        "specialties": profile.specialties or [],
        "bio": profile.bio,
        "commission_rate": profile.commission_rate,
        "average_rating": profile.average_rating,
        "total_jobs": profile.total_jobs,
        "is_available": profile.is_available,
    }


@router.post("/apply", response_model=dict, status_code=201)
async def apply_as_worker(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A user applies to join the platform as a worker/partner."""
    existing = (await db.execute(select(WorkerProfile).where(WorkerProfile.user_id == current_user.id))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a worker profile")

    specialties = payload.get("specialties") or []
    bio = payload.get("bio")
    role_value = payload.get("role")
    if role_value and role_value not in WORKER_ROLE_SET:
        raise HTTPException(status_code=400, detail="Invalid worker role")

    current_user.role = UserRole(role_value) if role_value else UserRole.PARTNER_FREELANCER
    db.add(WorkerProfile(
        user_id=current_user.id,
        specialties=specialties,
        bio=bio,
        commission_rate=float(payload.get("commission_rate", 20)),
        is_available=True,
    ))
    await log_action(db, "worker_applied", current_user.id, "users", current_user.id,
                     new_values={"role": current_user.role, "specialties": specialties})
    await db.commit()
    ref = (await db.execute(select(WorkerProfile).where(WorkerProfile.user_id == current_user.id))).scalar_one()
    return {"message": "Worker profile created", "worker_id": str(ref.id), "role": current_user.role}


@router.get("/profile/me", response_model=dict)
async def my_worker_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = (await db.execute(select(WorkerProfile).where(WorkerProfile.user_id == current_user.id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No worker profile")
    return _profile_out(current_user, profile)


@router.patch("/profile/me", response_model=dict)
async def update_worker_profile(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = (await db.execute(select(WorkerProfile).where(WorkerProfile.user_id == current_user.id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No worker profile")

    if "specialties" in payload:
        profile.specialties = payload["specialties"]
    if "bio" in payload:
        profile.bio = payload["bio"]
    if "is_available" in payload:
        profile.is_available = bool(payload["is_available"])
    if "commission_rate" in payload:
        profile.commission_rate = float(payload["commission_rate"])

    await log_action(db, "worker_profile_updated", current_user.id, "worker_profiles", profile.id,
                     new_values={k: v for k, v in payload.items()})
    await db.commit()
    await db.refresh(profile)
    return _profile_out(current_user, profile)


@router.get("/marketplace")
async def marketplace(
    specialty: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Directory of available workers by specialty for task matching."""
    query = (
        select(User, WorkerProfile)
        .join(WorkerProfile, WorkerProfile.user_id == User.id)
        .where(WorkerProfile.is_available.is_(True), User.is_active.is_(True))
        .order_by(WorkerProfile.average_rating.desc())
    )
    if specialty:
        # simple containment check on the JSON specialties list
        query = query.where(WorkerProfile.specialties.contains([specialty]))
    result = await db.execute(query)
    return [_profile_out(user, profile) for user, profile in result.all()]


@router.post("/orders/{order_id}/assign", response_model=dict)
async def assign_worker(
    order_id: UUID,
    payload: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin assigns a worker to an order."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    worker_id = payload.get("worker_id")
    if not worker_id:
        raise HTTPException(status_code=400, detail="worker_id is required")
    try:
        worker_id = UUID(str(worker_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid worker_id")
    worker = (await db.execute(select(User).where(User.id == worker_id))).scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    order.worker_id = worker.id
    if order.status in ("pending", "payment_pending", "received"):
        order.status = OrderStatus.ASSIGNED

    await log_action(db, "worker_assigned", current_user.id, "orders", order.id,
                     new_values={"worker_id": str(worker.id)})
    await db.commit()
    await db.refresh(order)
    return {"order_id": str(order.id), "order_number": order.order_number, "worker_id": str(worker.id),
            "status": order.status.value}
