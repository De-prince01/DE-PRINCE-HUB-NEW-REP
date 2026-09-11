"""Owner control (spec 69): manage almost everything from one place.

The owner (business_owner / super_admin) sees the whole business operation
from a single dashboard and guards the security-critical controls (audit
trail, staff roles, account status).
"""
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_owner, get_current_user
from app.models.user import User
from app.models.profile import WorkerProfile
from app.models.service import Service, ServiceCategory
from app.models.order import Order
from app.models.appointment import Appointment
from app.models.cybercafe import Computer, ComputerSession, PrintJob, InventoryItem, Expense, Branch, Delivery
from app.models.finance import Transaction, Wallet, Commission
from app.models.notification import Notification, AuditLog, Setting
from app.models.enums import UserRole

router = APIRouter(prefix="/owner", tags=["owner"])


def r2(v) -> float:
    return round(float(v or 0), 2)


STAFF_ROLES = [
    "admin", "manager", "staff", "printing_operator", "graphic_designer",
    "web_developer", "worker", "super_admin", "business_owner",
]


@router.get("/dashboard")
async def owner_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_owner)):
    """One-stop view of the entire business operation."""
    async def count(model, *where):
        q = select(func.count()).select_from(model)
        if where:
            q = q.where(*where)
        return (await db.execute(q)).scalar()

    async def sum_col(model, col, *where):
        q = select(func.coalesce(func.sum(col), 0)).select_from(model)
        if where:
            q = q.where(*where)
        return (await db.execute(q)).scalar()

    branches = (await db.execute(select(Branch).order_by(Branch.name))).scalars().all()
    settings = (await db.execute(select(Setting))).scalars().all()
    recent_audit = (await db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).limit(10)
    )).scalars().all()

    payment_rev = await sum_col(Transaction, Transaction.amount, Transaction.status == "completed",
                                Transaction.type == "order_payment")
    expenses = await sum_col(Expense, Expense.amount)
    wallet_balance = await sum_col(Wallet, Wallet.balance)
    commissions = await sum_col(Commission, Commission.commission_amount, Commission.is_paid.is_(True))

    return {
        "counts": {
            "services_active": await count(Service, Service.is_active.is_(True)),
            "service_categories": await count(ServiceCategory),
            "customers": await count(User, User.role == "customer"),
            "staff": await count(User, User.role.in_(STAFF_ROLES)),
            "workers_profiles": await count(WorkerProfile),
            "orders": await count(Order),
            "pending_orders": await count(Order, Order.status.in_(["pending", "payment_pending", "received"])),
            "appointments": await count(Appointment),
            "print_jobs": await count(PrintJob),
            "print_queue": await count(PrintJob, PrintJob.status.in_(["pending", "printing"])),
            "computers": await count(Computer),
            "active_sessions": await count(ComputerSession, ComputerSession.ended_at.is_(None)),
            "inventory_items": await count(InventoryItem),
            "deliveries": await count(Delivery),
            "branches": len(branches),
            "notifications": await count(Notification),
            "audit_entries": await count(AuditLog),
        },
        "money": {
            "paid_revenue": payment_rev,
            "expenses": expenses,
            "profit": r2(payment_rev - expenses),
            "wallet_balances_total": wallet_balance,
            "paid_commissions": commissions,
        },
        "branches": [{"id": str(b.id), "name": b.name, "address": (b.address or "")} for b in branches],
        "settings": {s.key: s.value for s in settings},
        "recent_audit": [
            {
                "action": a.action,
                "entity_type": a.entity_type,
                "user_id": str(a.user_id) if a.user_id else None,
                "created_at": a.created_at.isoformat(),
                "ip_address": a.ip_address,
            }
            for a in recent_audit
        ],
    }


@router.get("/audit-logs")
async def audit_logs(
    limit: int = 50,
    offset: int = 0,
    action: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Owner-only audit trail with actor names."""
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)

    query = (
        select(AuditLog, User.first_name, User.last_name, User.email)
        .outerjoin(User, User.id == AuditLog.user_id)
        .order_by(desc(AuditLog.created_at))
    )
    if action:
        query = query.where(AuditLog.action == action)
    rows = (await db.execute(query.limit(limit).offset(offset))).all()

    total = (await db.execute(
        select(func.count()).select_from(AuditLog).where(AuditLog.action == action) if action
        else select(func.count()).select_from(AuditLog)
    )).scalar()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "entries": [
            {
                "id": str(item.id),
                "action": item.action,
                "entity_type": item.entity_type,
                "entity_id": str(item.entity_id) if item.entity_id else None,
                "actor_name": f"{first} {last}".strip() if first else (email or "system"),
                "actor_email": email,
                "ip_address": item.ip_address,
                "created_at": item.created_at.isoformat(),
            }
            for item, first, last, email in rows
        ],
    }


@router.patch("/users/{user_id}/role")
async def set_user_role(
    user_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Owner-level staff role management (security critical)."""
    new_role = (payload.get("role") or "").strip().lower()
    allowed = {r.value for r in UserRole}
    if new_role not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid role. Allowed: {sorted(allowed)}")

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    if target.role == "super_admin" and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only a super admin can change another super admin")

    old_role = target.role
    target.role = new_role
    await log_action(
        db, "owner_role_changed", current_user.id, "users", target.id,
        old_values={"role": old_role}, new_values={"role": new_role},
    )
    await db.commit()
    return {"message": f"Role updated to {new_role}", "user_id": str(target.id), "role": new_role}


@router.patch("/users/{user_id}/status")
async def set_user_status(
    user_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    """Owner-level account enable/disable."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    new_status = bool(payload.get("is_active"))
    target.is_active = new_status
    await log_action(
        db, "owner_status_changed", current_user.id, "users", target.id,
        old_values={"is_active": not new_status}, new_values={"is_active": new_status},
    )
    await db.commit()
    return {"message": "Account updated", "user_id": str(target.id), "is_active": new_status}


from app.services.audit import log_action  # noqa: E402