"""Delivery endpoints: zones, dispatch, assignment and tracking.

- Every dispatch references an order, so deliveries stay coupled to real jobs.
- Customers can request delivery on their own order; the delivery fee is set
  from the chosen zone (local) or a custom amount with the address (custom).
- Only staff/admins can assign a delivery person; the assigned person can
  update their own delivery status while it is in their hands.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.cybercafe import DeliveryZone, Delivery
from app.models.order import Order
from app.models.enums import DeliveryType, OrderStatus
from app.schemas.delivery import (
    DeliveryZoneCreate, DeliveryZoneUpdate, DeliveryZoneOut,
    DeliveryCreate, DeliveryAssign, DeliveryStatusUpdate, DeliveryOut,
)
from app.services.audit import log_action
from app.services.notifications import notify_delivery_created, notify_delivery_status

router = APIRouter(prefix="/delivery", tags=["delivery"])

DELIVERY_FLOW = ["pending", "assigned", "picked_up", "out_for_delivery", "delivered"]
DELIVERY_RESULT = {"delivered", "cancelled"}


async def _decorate(d: Delivery, db: AsyncSession) -> Delivery:
    if getattr(d, "order_number", None) is None and d.order_id:
        res = await db.execute(select(Order.order_number).where(Order.id == d.order_id))
        row = res.first()
        d.order_number = row[0] if row else ""
    if getattr(d, "zone_name", None) is None and d.delivery_zone_id:
        res = await db.execute(select(DeliveryZone.name).where(DeliveryZone.id == d.delivery_zone_id))
        row = res.first()
        d.zone_name = row[0] if row else ""
    if getattr(d, "delivery_person_name", None) is None and d.delivery_person_id:
        res = await db.execute(
            select(User.first_name, User.last_name).where(User.id == d.delivery_person_id)
        )
        row = res.first()
        d.delivery_person_name = f"{row[0]} {row[1]}".strip() if row else ""
    return d


async def _load_delivery(delivery_id: UUID, db: AsyncSession) -> Delivery:
    res = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return d


def _can_see(user: User, d: Delivery) -> bool:
    if user.role in ("super_admin", "admin", "manager", "staff"):
        return True
    if user.role == "delivery_person":
        return d.delivery_person_id == user.id
    return False


# ---------------- Zones ----------------

@router.get("/zones", response_model=List[DeliveryZoneOut])
async def list_zones(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(DeliveryZone).order_by(DeliveryZone.name))
    zones = res.scalars().all()
    if current_user.role in ("customer",):
        zones = [z for z in zones if z.is_active]
    return zones


@router.post("/zones", response_model=DeliveryZoneOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_zone(
    data: DeliveryZoneCreate,
    db: AsyncSession = Depends(get_db),
):
    zone = DeliveryZone(**data.model_dump())
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return zone


@router.patch("/zones/{zone_id}", response_model=DeliveryZoneOut, dependencies=[Depends(require_admin)])
async def update_zone(
    zone_id: UUID,
    data: DeliveryZoneUpdate,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(DeliveryZone).where(DeliveryZone.id == zone_id))
    zone = res.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(zone, k, v)
    await db.commit()
    await db.refresh(zone)
    return zone


# ---------------- Dispatch ----------------

@router.post("", response_model=DeliveryOut, status_code=201)
async def create_delivery(
    data: DeliveryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Order).where(Order.id == data.order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.status in (OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.DELIVERED):
        raise HTTPException(status_code=400, detail=f"Cannot dispatch delivery for a {order.status.value} order")
    if order.delivery_type == DeliveryType.CUSTOM_DELIVERY and not data.address:
        raise HTTPException(status_code=400, detail="Custom delivery requires an address")

    existing = (await db.execute(select(Delivery).where(Delivery.order_id == order.id))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Order already has a dispatch")

    fee = 0.0
    zone = None
    if data.zone_id:
        zone = (await db.execute(select(DeliveryZone).where(DeliveryZone.id == data.zone_id))).scalar_one_or_none()
        if not zone or not zone.is_active:
            raise HTTPException(status_code=400, detail="Invalid delivery zone")
        fee = zone.fee
        order.delivery_type = DeliveryType.LOCAL_DELIVERY
    else:
        fee = 0.0  # custom delivery fee defaults to 0; admin may adjust
        order.delivery_type = DeliveryType.CUSTOM_DELIVERY

    delivery = Delivery(
        order_id=order.id,
        delivery_zone_id=zone.id if zone else None,
        delivery_type=order.delivery_type,
        address=data.address,
        fee=fee,
        status="pending",
        notes=data.notes,
    )
    order.delivery_fee = fee
    order.total = (order.subtotal or 0) + fee + (order.tax or 0) - (order.discount or 0)
    db.add(delivery)
    await db.flush()
    await log_action(db, "delivery_created", current_user.id, "deliveries", delivery.id,
                     new_values={"order_id": str(order.id), "fee": fee})
    await notify_delivery_created(db, delivery)
    await db.commit()
    await db.refresh(delivery)
    return await _decorate(delivery, db)


@router.get("", response_model=List[DeliveryOut])
async def list_deliveries(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Delivery)
    if current_user.role == "customer":
        query = query.join(Order, Order.id == Delivery.order_id).where(Order.customer_id == current_user.id)
    elif current_user.role == "delivery_person":
        query = query.where(Delivery.delivery_person_id == current_user.id)
    if status:
        query = query.where(Delivery.status == status)
    query = query.order_by(desc(Delivery.created_at))
    result = await db.execute(query)
    deliveries = result.scalars().all()
    out = []
    for d in deliveries:
        out.append(await _decorate(d, db))
    return out


@router.get("/{delivery_id}", response_model=DeliveryOut)
async def get_delivery(
    delivery_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if current_user.role == "customer":
        order = (await db.execute(select(Order).where(Order.id == d.order_id))).scalar_one_or_none()
        if not order or order.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your delivery")
    elif not _can_see(current_user, d):
        raise HTTPException(status_code=403, detail="Not your delivery")
    return await _decorate(d, db)


@router.patch("/{delivery_id}/assign", response_model=DeliveryOut, dependencies=[Depends(require_admin)])
async def assign_delivery(
    delivery_id: UUID,
    data: DeliveryAssign,
    db: AsyncSession = Depends(get_db),
):
    d = await _load_delivery(delivery_id, db)
    res = await db.execute(select(User).where(User.id == data.delivery_person_id))
    person = res.scalar_one_or_none()
    if not person or person.role != "delivery_person":
        raise HTTPException(status_code=400, detail="Selected user is not a delivery person")
    if d.status in DELIVERY_RESULT:
        raise HTTPException(status_code=400, detail=f"Cannot assign a delivery that is {d.status}")
    d.delivery_person_id = person.id
    if d.status == "pending":
        d.status = "assigned"
    await log_action(db, "delivery_assigned", None, "deliveries", d.id,
                     new_values={"delivery_person_id": str(person.id)})
    await notify_delivery_status(db, d)
    await db.commit()
    await db.refresh(d)
    return await _decorate(d, db)


@router.patch("/{delivery_id}/status", response_model=DeliveryOut)
async def update_delivery_status(
    delivery_id: UUID,
    data: DeliveryStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    d = await _load_delivery(delivery_id, db)
    is_staff = current_user.role in ("super_admin", "admin", "manager", "staff")
    is_assigned = current_user.role == "delivery_person" and d.delivery_person_id == current_user.id
    if not (is_staff or is_assigned):
        raise HTTPException(status_code=403, detail="You cannot update this delivery")
    if data.status not in DELIVERY_FLOW and data.status not in DELIVERY_RESULT:
        raise HTTPException(status_code=422, detail=f"status must be one of {DELIVERY_FLOW + sorted(DELIVERY_RESULT)}")
    if d.status in DELIVERY_RESULT:
        raise HTTPException(status_code=400, detail=f"Delivery is already {d.status}")
    if current_user.role == "delivery_person" and data.status not in ("picked_up", "out_for_delivery", "delivered"):
        raise HTTPException(status_code=403, detail="Delivery person can only update in-hand statuses")
    if data.notes:
        d.notes = data.notes
    d.status = data.status
    await log_action(db, "delivery_status", current_user.id, "deliveries", d.id,
                     old_values={"status": d.status}, new_values={"status": data.status})
    await notify_delivery_status(db, d)
    await db.commit()
    await db.refresh(d)
    return await _decorate(d, db)