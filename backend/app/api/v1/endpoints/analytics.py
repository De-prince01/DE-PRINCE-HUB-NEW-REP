"""Business analytics (spec §58).

Provides: most profitable / most ordered services, customer retention + acquisition,
worker performance, revenue by service / branch / payment method, expenses, profit,
order completion time and referral performance — under a single /analytics/overview.
"""
from collections import defaultdict
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.finance import Payment, Commission
from app.models.cybercafe import Branch, Expense
from app.models.referral import ReferralSignup, ReferralReward

router = APIRouter(prefix="/analytics", tags=["analytics"])

STAFF_ROLES = ("super_admin", "business_owner", "admin", "manager", "staff",
               "printing_operator", "graphic_designer", "web_developer",
               "academic_service_worker", "technician", "delivery_person",
               "partner_freelancer")

DONE_STATUSES = ("paid", "completed", "delivered")


def _is_staff(user: User) -> bool:
    return user.role in STAFF_ROLES


def r2(v) -> float:
    try:
        return round(float(v or 0), 2)
    except (TypeError, ValueError):
        return 0.0


@router.get("/overview")
async def analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    range_days: int = 365,
):
    if not _is_staff(current_user):
        raise HTTPException(403, "Staff access required")
    range_days = max(7, min(range_days or 365, 3650))
    since = datetime.utcnow() - timedelta(days=range_days)

    # ---- Revenue metric: paid/completed/delivered order totals -----------------
    rev_q = (select(func.coalesce(func.sum(Order.total), 0))
             .where(Order.status.in_(DONE_STATUSES), Order.deleted_at.is_(None)))
    revenue_total = r2((await db.execute(rev_q)).scalar())
    revenue_30d = r2((await db.execute(
        rev_q.where(Order.created_at >= datetime.utcnow() - timedelta(days=30)))).scalar())

    # ---- Revenue by service ------------------------------------------------------
    rows = (await db.execute(
        select(OrderItem.service_name,
               func.sum(OrderItem.total_price).label("revenue"))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(DONE_STATUSES), Order.deleted_at.is_(None))
        .group_by(OrderItem.service_name)
        .order_by(func.sum(OrderItem.total_price).desc())
        .limit(10)
    )).all()
    revenue_by_service = [{"service": r[0], "revenue": r2(r[1])} for r in rows]

    # ---- Most ordered / most profitable services --------------------------------
    orows = (await db.execute(
        select(OrderItem.service_name,
               func.count(func.distinct(Order.id)).label("orders"),
               func.sum(OrderItem.quantity).label("units"),
               func.sum(OrderItem.total_price).label("revenue"))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(DONE_STATUSES), Order.deleted_at.is_(None))
        .group_by(OrderItem.service_name)
        .order_by(func.count(func.distinct(Order.id)).desc())
        .limit(5)
    )).all()
    most_ordered = [{"service": r[0], "orders": int(r[1] or 0), "units": int(r[2] or 0),
                     "revenue": r2(r[3])} for r in orows]
    most_profitable = [{"service": r[0], "orders": int(r[1] or 0),
                        "units": int(r[2] or 0), "revenue": r2(r[3])}
                       for r in sorted(orows, key=lambda x: -(x[3] or 0))][:1]

    # ---- Revenue by branch -------------------------------------------------------
    brows = (await db.execute(
        select(Branch.name, func.coalesce(func.sum(Order.total), 0).label("revenue"))
        .join(Order, Order.branch_id == Branch.id)
        .where(Order.status.in_(DONE_STATUSES), Order.deleted_at.is_(None))
        .group_by(Branch.name)
        .order_by(func.sum(Order.total).desc())
    )).all()
    unassigned = r2((await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.branch_id.is_(None), Order.status.in_(DONE_STATUSES),
               Order.deleted_at.is_(None)))).scalar())
    revenue_by_branch = [{"branch": b[0], "revenue": r2(b[1])} for b in brows]
    if unassigned:
        revenue_by_branch.append({"branch": "Unassigned", "revenue": unassigned})

    # ---- Revenue by payment method ----------------------------------------------
    prows = (await db.execute(
        select(Payment.payment_method, func.coalesce(func.sum(Payment.amount), 0).label("paid"))
        .where(Payment.status == "completed")
        .group_by(Payment.payment_method)
        .order_by(func.sum(Payment.amount).desc())
    )).all()
    revenue_by_payment_method = [{"method": str(p[0].value if hasattr(p[0], "value") else p[0]),
                                  "amount": r2(p[1])} for p in prows]

    # ---- Expenses ----------------------------------------------------------------
    etotal = r2((await db.execute(select(func.coalesce(func.sum(Expense.amount), 0)))).scalar())
    e30 = r2((await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.created_at >= datetime.utcnow() - timedelta(days=30)))).scalar())
    erows = (await db.execute(
        select(Expense.category, func.coalesce(func.sum(Expense.amount), 0).label("amount"))
        .group_by(Expense.category).order_by(func.sum(Expense.amount).desc())
    )).all()
    expenses_by_category = [{"category": e[0], "amount": r2(e[1])} for e in erows]

    profit = r2(revenue_total - etotal)
    profit_30d = r2(revenue_30d - e30)

    # ---- Customer retention ------------------------------------------------------
    total_customers = (await db.execute(
        select(func.count()).select_from(User).where(User.role == "customer"))).scalar() or 0
    repeat_rows = (await db.execute(
        select(Order.customer_id).where(Order.deleted_at.is_(None))
        .group_by(Order.customer_id)
        .having(func.count(Order.id) >= 2)
    )).scalars().all()
    total_orders = (await db.execute(
        select(func.count()).select_from(Order).where(Order.deleted_at.is_(None)))).scalar() or 0
    retention_rate = r2(100.0 * len(repeat_rows) / total_customers) if total_customers else 0.0
    avg_orders_per_customer = r2(total_orders / total_customers) if total_customers else 0.0

    # ---- Customer acquisition: monthly new customers (last 6 months) -------------
    users = (await db.execute(
        select(User.created_at).where(User.role == "customer", User.created_at >= since)
    )).scalars().all()
    monthly = defaultdict(int)
    for ts in users:
        monthly[ts.strftime("%Y-%m")] += 1
    last6 = []
    base = datetime.utcnow()
    for i in range(5, -1, -1):
        y, m = (base - timedelta(days=30 * i)).strftime("%Y-%m").split("-")
        key = f"{y}-{m}"
        last6.append({"month": f"{y}-{m}", "new_customers": monthly.get(key, 0)})
    customer_acquisition = last6

    # ---- Worker performance ------------------------------------------------------
    wrows = (await db.execute(
        select(Commission.worker_id,
               func.count(Commission.id).label("jobs"),
               func.sum(Commission.commission_amount).label("commission"),
               func.sum(Commission.worker_amount).label("earned"))
        .group_by(Commission.worker_id)
        .order_by(func.sum(Commission.worker_amount).desc())
        .limit(5)
    )).all()
    worker_ids = [w[0] for w in wrows]
    names = {}
    if worker_ids:
        for u in (await db.execute(select(User).where(User.id.in_(worker_ids)))).scalars():
            names[u.id] = f"{u.first_name} {u.last_name}".strip()
    worker_performance = [
        {"worker": names.get(w[0], str(w[0])), "jobs": int(w[1] or 0),
         "commission": r2(w[2]), "earned": r2(w[3])} for w in wrows
    ]

    # ---- Order completion time ---------------------------------------------------
    cot_rows = (await db.execute(
        select(Order.created_at, Order.completed_at)
        .where(Order.completed_at.is_not(None), Order.deleted_at.is_(None))
    )).all()
    hours = [(b - a).total_seconds() / 3600 for a, b in cot_rows if a and b and b > a]
    avg_completion_hours = r2(sum(hours) / len(hours)) if hours else 0.0
    completion = {"completed_orders": len(hours),
                  "avg_completion_hours": avg_completion_hours,
                  "avg_completion_days": r2(avg_completion_hours / 24)}
    if hours:
        completion["min_hours"] = r2(min(hours))
        completion["max_hours"] = r2(max(hours))

    # ---- Referral performance ----------------------------------------------------
    signups_total = (await db.execute(select(func.count()).select_from(ReferralSignup))).scalar() or 0
    rewards_total = (await db.execute(select(func.count()).select_from(ReferralReward))).scalar() or 0
    reward_value = r2((await db.execute(
        select(func.coalesce(func.sum(ReferralReward.amount), 0)))).scalar())
    rrows = (await db.execute(
        select(ReferralSignup.referrer_id, func.count(ReferralSignup.id).label("refers"))
        .group_by(ReferralSignup.referrer_id).order_by(func.count(ReferralSignup.id).desc())
        .limit(3)
    )).all()
    ref_names = {}
    ref_ids = [r[0] for r in rrows]
    if ref_ids:
        for u in (await db.execute(select(User).where(User.id.in_(ref_ids)))).scalars():
            ref_names[u.id] = f"{u.first_name} {u.last_name}".strip()
    referral_performance = {
        "total_signups": signups_total,
        "total_rewards": rewards_total,
        "total_reward_value": reward_value,
        "top_referrers": [{"referrer": ref_names.get(r[0], str(r[0])), "signups": int(r[1])}
                          for r in rrows],
    }

    return {
        "range_days": range_days,
        "summary": {
            "total_revenue": revenue_total,
            "revenue_last_30d": revenue_30d,
            "total_expenses": etotal,
            "expenses_last_30d": e30,
            "profit": profit,
            "profit_last_30d": profit_30d,
            "total_orders": total_orders,
            "total_customers": total_customers,
        },
        "most_profitable_service": most_profitable,
        "most_ordered_services": most_ordered,
        "revenue_by_service": revenue_by_service,
        "revenue_by_branch": revenue_by_branch,
        "revenue_by_payment_method": revenue_by_payment_method,
        "expenses_by_category": expenses_by_category,
        "customer_retention": {
            "retention_rate": retention_rate,
            "repeat_customers": len(repeat_rows),
            "total_customers": total_customers,
            "avg_orders_per_customer": avg_orders_per_customer,
        },
        "customer_acquisition": customer_acquisition,
        "worker_performance": worker_performance,
        "order_completion_time": completion,
        "referral_performance": referral_performance,
    }