"""Admin endpoints: users, workers, computers, dashboard stats."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.user import User
from app.models.profile import WorkerProfile
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.cybercafe import Computer, ComputerSession, PrintJob, Expense, InventoryItem
from app.models.finance import Transaction, Wallet
from app.models.notification import Setting
from app.models.enums import OrderStatus, ComputerStatus
from app.schemas.auth import UserOut
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.services.notifications import notify_order_status
from app.services.audit import log_action

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    total_customers = (await db.execute(
        select(func.count()).select_from(User).where(User.role == "customer")
    )).scalar()
    total_orders = (await db.execute(select(func.count()).select_from(Order))).scalar()
    pending_orders = (await db.execute(
        select(func.count()).select_from(Order).where(Order.status.in_(["pending", "payment_pending", "received"]))
    )).scalar()
    completed_orders = (await db.execute(
        select(func.count()).select_from(Order).where(Order.status == "completed")
    )).scalar()

    revenue = (await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.status == "completed", Transaction.type == "order_payment"
        )
    )).scalar()

    workers = (await db.execute(
        select(func.count()).select_from(WorkerProfile)
    )).scalar()

    active_sessions = (await db.execute(
        select(func.count()).select_from(ComputerSession).where(ComputerSession.ended_at.is_(None))
    )).scalar()

    print_queue = (await db.execute(
        select(func.count()).select_from(PrintJob).where(PrintJob.status.in_(["pending", "printing"]))
    )).scalar()

    total_expenses = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
    )).scalar()

    recent_orders = (await db.execute(
        select(Order).order_by(desc(Order.created_at)).limit(10)
    )).scalars().all()

    return {
        "total_users": total_users,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_revenue": revenue,
        "active_workers": workers,
        "active_sessions": active_sessions,
        "print_queue": print_queue,
        "total_expenses": total_expenses,
        "profit": revenue - total_expenses,
        "recent_orders": [{"id": str(o.id), "order_number": o.order_number, "status": o.status.value, "total": o.total} for o in recent_orders],
    }


@router.get("/orders", response_model=List[OrderOut])
async def admin_list_orders(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(desc(Order.created_at))
    )
    if status_filter:
        query = query.where(Order.status == status_filter)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/orders/{order_id}/status", response_model=OrderOut)
async def admin_update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old = order.status
    try:
        new_status = OrderStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    order.status = new_status
    db.add(OrderStatusHistory(
        order_id=order.id, from_status=old, to_status=new_status,
        changed_by=current_user.id, notes=data.notes,
    ))
    await notify_order_status(db, order.customer_id, order, data.status)
    await log_action(db, "order_status_update", current_user.id, "orders", order.id,
                     old_values={"status": old.value}, new_values={"status": new_status.value})
    await db.commit()
    await db.refresh(order)
    return order


@router.get("/users", response_model=List[UserOut])
async def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).order_by(User.created_at.desc())
    if role:
        query = query.where(User.role == role)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/workers")
async def list_workers(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User, WorkerProfile).join(WorkerProfile, WorkerProfile.user_id == User.id)
    )
    workers = []
    for user, profile in result.all():
        workers.append({
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "specialties": profile.specialties or [],
            "commission_rate": profile.commission_rate,
            "total_earnings": profile.total_earnings,
            "total_jobs": profile.total_jobs,
            "average_rating": profile.average_rating,
            "is_available": profile.is_available,
            "is_active": user.is_active,
        })
    return workers


@router.post("/workers/{user_id}/approve")
async def approve_worker(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    await log_action(db, "worker_approved", current_user.id, "users", user.id)
    await db.commit()
    return {"message": "Worker approved"}


@router.get("/settings")
async def get_settings(current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting))
    return {s.key: s.value for s in result.scalars().all()}


@router.put("/settings")
async def update_settings(
    payload: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    for key, value in payload.items():
        existing = (await db.execute(select(Setting).where(Setting.key == key))).scalar_one_or_none()
        if existing:
            existing.value = value
        else:
            db.add(Setting(key=key, value=value))
    await log_action(db, "settings_updated", current_user.id, "settings", None, new_values=payload)
    await db.commit()
    return {"message": "Settings updated"}


@router.get("/computers")
async def admin_list_computers(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Computer).order_by(Computer.name))
    computers = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "status": c.status.value,
            "hourly_rate": c.hourly_rate,
        }
        for c in computers
    ]


@router.patch("/computers/{computer_id}")
async def admin_update_computer_status(
    computer_id: UUID,
    payload: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Computer).where(Computer.id == computer_id))
    computer = result.scalar_one_or_none()
    if not computer:
        raise HTTPException(status_code=404, detail="Computer not found")

    new_status = payload.get("status")
    try:
        computer.status = ComputerStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    await log_action(db, "computer_status_update", current_user.id, "computers", computer.id,
                     new_values={"status": computer.status.value})
    await db.commit()
    await db.refresh(computer)
    return {"id": str(computer.id), "name": computer.name, "status": computer.status.value}
