"""Business-model endpoints: revenue streams + seasonality (spec §60, §61).

DE-PRINCE earns from many streams. Admin can tag any service category to a
revenue stream (or create a brand-new category for a new stream) without
rewriting the app - the report below is computed live from real data.
"""
from fastapi import APIRouter, Depends

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User
from app.models.service import Service, ServiceCategory
from app.models.order import Order, OrderItem
from app.models.cybercafe import PrintJob, ComputerSession
from app.models.finance import Commission, WalletTransaction
from app.services.business import REVENUE_STREAMS, STREAM_CODES

router = APIRouter(prefix="/business", tags=["business"])

PAID_STATUSES = ["paid", "completed", "delivered", "ready_for_pickup"]


def r2(v) -> float:
    return round(float(v or 0), 2)


@router.get("/revenue-streams")
async def revenue_streams(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    """Live revenue per DE-PRINCE revenue stream, computed from real data."""

    # 1. category-tagged streams -> revenue from order items whose service
    #    belongs to a category tagged with that stream
    item_rows = await db.execute(
        select(
            ServiceCategory.revenue_stream,
            func.sum(OrderItem.total_price),
        )
        .join(Service, ServiceCategory.id == Service.category_id)
        .join(OrderItem, OrderItem.service_id == Service.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(PAID_STATUSES),
               ServiceCategory.revenue_stream.is_not(None))
        .group_by(ServiceCategory.revenue_stream)
    )
    category_rev = {code: r2(total) for code, total in item_rows.all()}

    unmapped_rev = 0.0
    unmapped_rows = await db.execute(
        select(
            ServiceCategory.revenue_stream,
            func.sum(OrderItem.total_price),
        )
        .join(Service, ServiceCategory.id == Service.category_id)
        .join(OrderItem, OrderItem.service_id == Service.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(PAID_STATUSES),
               ServiceCategory.revenue_stream.is_(None))
    )
    for _, total in unmapped_rows.all():
        unmapped_rev += r2(total)

    # 2. dedicated streams from their own tables
    print_jobs = (await db.execute(
        select(func.sum(PrintJob.total_amount)).where(PrintJob.is_paid.is_(True))
    )).scalar_one()
    print_jobs_count = (await db.execute(
        select(func.count(PrintJob.id)).where(PrintJob.is_paid.is_(True))
    )).scalar_one()
    cafe_sessions = (await db.execute(
        select(func.sum(ComputerSession.total_amount)).where(ComputerSession.is_paid.is_(True))
    )).scalar_one()
    cafe_sessions_count = (await db.execute(
        select(func.count(ComputerSession.id)).where(ComputerSession.is_paid.is_(True))
    )).scalar_one()
    delivery_fees = (await db.execute(
        select(func.sum(Order.delivery_fee)).where(
            Order.delivery_fee.is_not(None),
            Order.status.in_(PAID_STATUSES),
        )
    )).scalar_one()
    commissions = (await db.execute(
        select(func.sum(Commission.commission_amount)).where(Commission.is_paid.is_(True))
    )).scalar_one()
    subscription_rev = (await db.execute(
        select(func.sum(WalletTransaction.amount)).where(
            WalletTransaction.type == "subscription_renewal")
    )).scalar_one()
    referral_rev = (await db.execute(
        select(func.sum(WalletTransaction.amount)).where(
            WalletTransaction.type == "referral_reward")
    )).scalar_one()

    # 3. per-stream order/ticket counts
    stream_counts = {}
    count_rows = await db.execute(
        select(ServiceCategory.revenue_stream, func.count(func.distinct(Order.id)))
        .join(Service, ServiceCategory.id == Service.category_id)
        .join(OrderItem, OrderItem.service_id == Service.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status.in_(PAID_STATUSES),
               ServiceCategory.revenue_stream.is_not(None))
        .group_by(ServiceCategory.revenue_stream)
    )
    for code, cnt in count_rows.all():
        stream_counts[code] = int(cnt)

    # 4. which categories map to which streams
    cat_rows = (await db.execute(
        select(ServiceCategory).where(ServiceCategory.revenue_stream.is_not(None)))).scalars().all()
    category_counts = {code: 0 for code in STREAM_CODES}
    for c in cat_rows:
        if c.revenue_stream in category_counts:
            category_counts[c.revenue_stream] += 1
    unmapped = (await db.execute(
        select(func.count()).select_from(ServiceCategory).where(
            ServiceCategory.revenue_stream.is_(None)))).scalar_one()

    streams_out = []
    for s in REVENUE_STREAMS:
        code = s["code"]
        if code == "printing":
            rev = r2(category_rev.get(code)) + r2(print_jobs)
            orders = stream_counts.get(code, 0) + int(print_jobs_count or 0)
        elif code == "computer_sessions":
            rev = r2(category_rev.get(code)) + r2(cafe_sessions)
            orders = stream_counts.get(code, 0) + int(cafe_sessions_count or 0)
        elif code == "delivery":
            rev = r2(delivery_fees)
            orders = stream_counts.get(code, 0)
        elif code == "worker_commissions":
            rev = r2(commissions)
            orders = stream_counts.get(code, 0)
        elif code == "subscriptions":
            rev = r2(subscription_rev)
            orders = stream_counts.get(code, 0)
        elif code == "referral_partnerships":
            rev = r2(referral_rev)
            orders = stream_counts.get(code, 0)
        else:
            rev = r2(category_rev.get(code))
            orders = stream_counts.get(code, 0)
        streams_out.append({
            "code": code,
            "name": s["name"],
            "kind": s["kind"],
            "description": s["description"],
            "revenue": rev,
            "orders": orders,
            "categories": category_counts.get(code, 0),
            "active": rev > 0,
        })

    total_revenue = r2(sum(s["revenue"] for s in streams_out))
    return {
        "total_revenue": total_revenue,
        "stream_count": len(streams_out),
        "streams": streams_out,
        "unmapped_category_revenue": r2(unmapped_rev),
        "unmapped_categories": int(unmapped or 0),
        "note": "Category streams are computed from paid orders; dedicated streams from their own tables. "
                "Adding a new category and tagging it to a stream needs no application rewrite.",
    }


@router.get("/seasonality")
async def seasonality(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    """Seasonal vs year-round resilience report (spec §61).

    The platform must NOT depend on only one service. Even if the JAMB season
    ends, customers still use printing, NYSC, CAC, CV, jobs, graphics, web
    development, computer services, business services, training, document
    services, delivery, online applications, etc. This endpoint surfaces the
    year-round backbone and how much of the business is seasonal.
    """
    # service rows joined with category + revenue from paid order items
    rows = await db.execute(
        select(
            Service, ServiceCategory.name, ServiceCategory.revenue_stream,
            func.sum(OrderItem.total_price),
        )
        .join(ServiceCategory, Service.category_id == ServiceCategory.id)
        .outerjoin(OrderItem, OrderItem.service_id == Service.id)
        .outerjoin(Order, Order.id == OrderItem.order_id)
        .where(Service.is_active.is_(True),
               ServiceCategory.is_active.is_(True),
               (Order.status.in_(PAID_STATUSES)) | (Order.status.is_(None)))
        .group_by(Service.id)
    )
    services = []
    seasonal_list, year_round = [], []
    seasonal_rev = 0.0
    for s, cat_name, cat_stream, rev in rows.all():
        rev = r2(rev)
        item = {
            "id": str(s.id),
            "name": s.name,
            "category": cat_name,
            "revenue_stream": cat_stream,
            "is_seasonal": bool(s.is_seasonal),
            "season_label": s.season_label,
            "season_months": s.season_months or [],
            "revenue": rev,
        }
        services.append(item)
        if s.is_seasonal:
            seasonal_list.append(item)
            seasonal_rev += rev
        else:
            year_round.append(item)

    year_round_rev = r2(sum(i["revenue"] for i in year_round))

    # year-round backbone by category + by revenue stream (distinct)
    by_cat = {}
    for i in year_round:
        by_cat.setdefault(i["category"], {"services": 0, "revenue": 0.0})
        by_cat[i["category"]]["services"] += 1
        by_cat[i["category"]]["revenue"] += i["revenue"]
    backbone = [
        {"category": c, "services": v["services"], "revenue": r2(v["revenue"])}
        for c, v in sorted(by_cat.items(), key=lambda kv: -kv[1]["revenue"])
    ]
    year_round_streams = sorted({i["revenue_stream"] for i in year_round if i["revenue_stream"]})

    return {
        "total_active_services": len(services),
        "seasonal_services": len(seasonal_list),
        "year_round_services": len(year_round),
        "seasonal_revenue": r2(seasonal_rev),
        "year_round_revenue": year_round_rev,
        "share_if_jamb_ends": r2(year_round_rev / (seasonal_rev + year_round_rev) if (seasonal_rev + year_round_rev) else 1),
        "year_round_streams": year_round_streams,
        "seasonal": sorted(seasonal_list, key=lambda i: -i["revenue"]),
        "year_round_backbone": backbone,
        "note": "Even if the JAMB season ends, customers still use printing, NYSC, CAC, CV, jobs, graphics, "
                "web development, computer services, business services, training, document services, "
                "delivery, online applications, etc. The platform never depends on a single service.",
    }