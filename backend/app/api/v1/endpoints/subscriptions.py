"""Subscription endpoints: plans, subscribe, renew/cancel/pause/expire tracking.

Flow (spec §36):
  Admin → create subscription PLAN (website maintenance, IT support, hosting…)
          with a billing cycle (monthly/quarterly/yearly) and amount.
  Customer → SUBSCRIBE to a plan (auto_renew optional).
  Renewals → each cycle creates a record and (optionally) debits wallet, advancing
             next_billing_date; service status and expiration are tracked.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionRenewal
from app.models.finance import Wallet, Transaction, WalletTransaction
from app.models.enums import BillingCycle, SubscriptionStatus, PaymentStatus, PaymentMethod
from app.schemas.subscription import (
    SubscriptionPlanCreate, SubscriptionPlanOut, SubscriptionCreate,
    SubscriptionOut, SubscriptionRenewalOut,
)
from app.services.audit import log_action
from app.services.notifications import create_notification

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

STAFF_ROLES = ("super_admin", "business_owner", "admin", "manager", "staff")


def _is_staff(user: User) -> bool:
    return user.role in STAFF_ROLES


def _cycle_months(cycle: str) -> int:
    if cycle == "yearly":
        return 12
    if cycle == "quarterly":
        return 3
    return 1


def _slugify(name: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "plan"


def _add_months(dt: datetime, months: int) -> datetime:
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    day = min(dt.day, 28)
    return dt.replace(year=year, month=month, day=day)


async def _decorate(db: AsyncSession, subs: list, customer_names: Optional[dict] = None) -> list:
    plan_ids = {s.plan_id for s in subs}
    plans = (await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id.in_(plan_ids or {UUID(int=0)})))).scalars().all()
    plan_map = {p.id: p for p in plans}
    renewal_map: dict = {}
    for s in subs:
        rv = (await db.execute(select(SubscriptionRenewal)
              .where(SubscriptionRenewal.subscription_id == s.id)
              .order_by(desc(SubscriptionRenewal.created_at)))).scalars().all()
        renewal_map[s.id] = rv
        s.__dict__["renewals"] = rv
    out = []
    for s in subs:
        d = SubscriptionOut.model_validate(s)
        p = plan_map.get(s.plan_id)
        d.plan_name = getattr(p, "name", None) if p else None
        if customer_names and s.customer_id in customer_names:
            d.customer_name = customer_names[s.customer_id]
        out.append(d)
    return out


async def _decorate_one(db: AsyncSession, sub: Subscription) -> SubscriptionOut:
    out_list = await _decorate(db, [sub])
    return out_list[0]


@router.get("/plans", response_model=List[SubscriptionPlanOut])
async def list_plans(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.is_active.is_(True)).order_by(desc(SubscriptionPlan.created_at)))
    return res.scalars().all()


@router.post("/plans", response_model=SubscriptionPlanOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_plan(payload: SubscriptionPlanCreate, db: AsyncSession = Depends(get_db)):
    if payload.billing_cycle not in ("monthly", "quarterly", "yearly"):
        raise HTTPException(status_code=400, detail="billing_cycle must be monthly, quarterly or yearly")
    existing = (await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == _slugify(payload.name)))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Plan with this name already exists")
    plan = SubscriptionPlan(
        name=payload.name,
        slug=_slugify(payload.name),
        service_id=payload.service_id,
        icon=payload.icon,
        description=payload.description,
        billing_cycle=BillingCycle(payload.billing_cycle),
        amount=payload.amount,
        is_active=payload.is_active,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    await log_action(db, "subscription_plan_created", None, "subscription_plans", plan.id)
    return plan


@router.patch("/plans/{plan_id}", response_model=SubscriptionPlanOut)
async def update_plan(plan_id: UUID, payload: SubscriptionPlanCreate, db: AsyncSession = Depends(get_db),
                      _: User = Depends(require_admin)):
    plan = (await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan.name = payload.name
    plan.slug = _slugify(payload.name)
    plan.description = payload.description
    plan.icon = payload.icon
    plan.service_id = payload.service_id
    plan.billing_cycle = BillingCycle(payload.billing_cycle)
    plan.amount = payload.amount
    plan.is_active = payload.is_active
    await db.commit()
    await db.refresh(plan)
    await log_action(db, "subscription_plan_updated", None, "subscription_plans", plan.id)
    return plan


@router.get("", response_model=List[SubscriptionOut])
async def list_subscriptions(status: Optional[str] = None, db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    q = select(Subscription)
    if _is_staff(current_user):
        if status:
            if status not in ("active", "paused", "cancelled", "expired"):
                raise HTTPException(status_code=400, detail="Invalid status")
            q = q.where(Subscription.status == SubscriptionStatus(status))
        q = q.order_by(desc(Subscription.created_at))
    else:
        q = q.where(Subscription.customer_id == current_user.id).order_by(desc(Subscription.created_at))
    subs = (await db.execute(q)).scalars().all()
    return await _decorate(db, list(subs))


@router.post("/subscribe", response_model=SubscriptionOut, status_code=201)
async def subscribe(payload: SubscriptionCreate, db: AsyncSession = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    plan = (await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == payload.plan_id))).scalar_one_or_none()
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found / inactive")
    active = (await db.execute(select(Subscription).where(
        Subscription.customer_id == current_user.id,
        Subscription.plan_id == payload.plan_id,
        Subscription.status != SubscriptionStatus.CANCELLED,
    ))).scalars().first()
    if active:
        raise HTTPException(status_code=400, detail="You already have an active subscription to this plan")
    now = datetime.utcnow()
    sub = Subscription(
        subscription_number=f"SU-{now.strftime('%Y%m%d')}-{uuid4_hex()}",
        customer_id=current_user.id,
        plan_id=plan.id,
        amount=plan.amount,
        billing_cycle=plan.billing_cycle,
        status=SubscriptionStatus.ACTIVE,
        service_status="provisioning",
        start_date=now,
        next_billing_date=_add_months(now, _cycle_months(plan.billing_cycle.value if isinstance(plan.billing_cycle, BillingCycle) else plan.billing_cycle)),
        auto_renew=payload.auto_renew,
    )
    db.add(sub)
    await db.flush()
    renewal = SubscriptionRenewal(
        subscription_id=sub.id,
        cycle_start=now,
        cycle_end=_add_months(now, _cycle_months(plan.billing_cycle.value if isinstance(plan.billing_cycle, BillingCycle) else plan.billing_cycle)),
        amount=plan.amount,
        status=PaymentStatus.PENDING,
    )
    db.add(renewal)
    await create_notification(db, current_user.id, "Subscription started",
                              f"Your {plan.name} subscription is active ({plan.billing_cycle.value}).",
                              type="system", data={"subscription_id": str(sub.id)})
    await db.commit()
    await log_action(db, "subscription_created", current_user.id, "subscriptions", sub.id)
    return await _decorate_one(db, sub)


@router.get("/{subscription_id}", response_model=SubscriptionOut)
async def get_subscription(subscription_id: UUID, db: AsyncSession = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    sub = (await db.execute(select(Subscription).where(Subscription.id == subscription_id))).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if not _is_staff(current_user) and sub.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return await _decorate_one(db, sub)


@router.patch("/{subscription_id}/cancel", response_model=SubscriptionOut)
async def cancel_subscription(subscription_id: UUID, db: AsyncSession = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    sub, subj = await _load_own(subscription_id, current_user, db)
    if sub.status == SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Subscription already cancelled")
    sub.status = SubscriptionStatus.CANCELLED
    sub.service_status = "cancelled"
    sub.auto_renew = False
    await db.commit()
    await log_action(db, "subscription_cancelled", subj, "subscriptions", sub.id)
    return await _decorate_one(db, sub)


@router.patch("/{subscription_id}/pause", response_model=SubscriptionOut)
async def pause_subscription(subscription_id: UUID, db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    sub, subj = await _load_own(subscription_id, current_user, db)
    if sub.status != SubscriptionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Only active subscriptions can be paused")
    sub.status = SubscriptionStatus.PAUSED
    sub.service_status = "paused"
    await db.commit()
    await log_action(db, "subscription_paused", subj, "subscriptions", sub.id)
    return await _decorate_one(db, sub)


@router.patch("/{subscription_id}/resume", response_model=SubscriptionOut)
async def resume_subscription(subscription_id: UUID, db: AsyncSession = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    sub, subj = await _load_own(subscription_id, current_user, db)
    if sub.status != SubscriptionStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Only paused subscriptions can be resumed")
    sub.status = SubscriptionStatus.ACTIVE
    sub.service_status = "active"
    await db.commit()
    await log_action(db, "subscription_resumed", subj, "subscriptions", sub.id)
    return await _decorate_one(db, sub)


@router.post("/{subscription_id}/renew", response_model=SubscriptionOut)
async def renew_subscription(subscription_id: UUID, db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    sub, subj = await _load_own(subscription_id, current_user, db)
    if sub.status != SubscriptionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Subscription is not active")
    now = datetime.utcnow()
    if (not _is_staff(current_user)) and sub.next_billing_date and sub.next_billing_date > now:
        raise HTTPException(status_code=400, detail="Subscription is not yet due for renewal")
    months = _cycle_months(sub.billing_cycle.value if isinstance(sub.billing_cycle, BillingCycle) else sub.billing_cycle)
    cycle_end = _add_months(now, months)
    payment_status = PaymentStatus.PENDING
    payment_method = None
    transaction_ref = None
    if sub.auto_renew:
        wallet = (await db.execute(select(Wallet).where(Wallet.user_id == sub.customer_id))).scalar_one_or_none()
        if wallet and wallet.balance >= sub.amount:
            wallet.balance = round(wallet.balance - sub.amount, 2)
            transaction_ref = f"REN-{now.strftime('%Y%m%d%H%M%S')}-{uuid4_hex()}"
            db.add(WalletTransaction(wallet_id=wallet.id, type="debit", amount=sub.amount, reference=transaction_ref))
            db.add(Transaction(user_id=sub.customer_id, reference=transaction_ref, type="subscription_renewal",
                               amount=sub.amount, status=PaymentStatus.COMPLETED,
                               payment_method=PaymentMethod.WALLET, gateway="wallet",
                               meta={"subscription_id": str(sub.id), "cycle_end": cycle_end.isoformat()}))
            payment_status = PaymentStatus.COMPLETED
            payment_method = "wallet"
    renewal = SubscriptionRenewal(
        subscription_id=sub.id,
        cycle_start=now,
        cycle_end=cycle_end,
        amount=sub.amount,
        status=payment_status,
        payment_method=payment_method,
        transaction_ref=transaction_ref,
    )
    db.add(renewal)
    sub.renewal_count += 1
    sub.last_billed_at = now
    sub.next_billing_date = cycle_end
    sub.service_status = "active"
    await db.flush()
    if payment_status == PaymentStatus.COMPLETED:
        await create_notification(db, sub.customer_id, "Subscription renewed",
                                  f"Renewed {sub.subscription_number} — {sub.amount:.0f} charged to wallet.",
                                  type="system", data={"subscription_id": str(sub.id)})
    else:
        await create_notification(db, sub.customer_id, "Subscription renewal pending",
                                  f"Your renewal for {sub.subscription_number} is pending payment.",
                                  type="system", data={"subscription_id": str(sub.id)})
    # Expire recurring subscriptions that are not on auto-renew and past due
    if not sub.auto_renew and payment_status == PaymentStatus.PENDING:
        sub.status = SubscriptionStatus.EXPIRED
        sub.service_status = "expired"
    await db.commit()
    await log_action(db, "subscription_renewed", subj, "subscriptions", sub.id)
    return await _decorate_one(db, sub)


async def _load_own(subscription_id: UUID, user: User, db: AsyncSession):
    sub = (await db.execute(select(Subscription).where(Subscription.id == subscription_id))).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if not _is_staff(user) and sub.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return sub, user.id


def uuid4_hex() -> str:
    import uuid as _uuid
    return _uuid.uuid4().hex[:6].upper()
