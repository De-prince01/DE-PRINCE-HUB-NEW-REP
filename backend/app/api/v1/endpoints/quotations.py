"""Quotation endpoints: requests, quotes, and the accept/reject/change flow.

Flow (spec §28):
  Customer → REQUEST QUOTE (service, description, files, requirements, deadline, budget)
  Admin/worker → creates a QUOTATION with items (title, qty, price), discount,
                 delivery, tax, total and a validity period.
  Customer → ACCEPT / REJECT / REQUEST CHANGE.

Accepting the final (non-superseded) quotation creates an Order so the job can
progress through the existing order/payment flow.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin, require_roles
from app.models.user import User
from app.models.service import Service
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.quotation import QuotationRequest, Quotation, QuotationItem
from app.models.enums import OrderStatus
from app.schemas.quotation import (
    QuotationRequestCreate, QuotationCreate, QuotationOut, QuotationRequestOut,
    QuotationResponseAction,
)
from app.services.audit import log_action
from app.services.order_number import generate_order_number
from app.services.notifications import create_notification

router = APIRouter(prefix="/quotations", tags=["quotations"])

STAFF_ROLES = ("super_admin", "business_owner", "admin", "manager", "staff",
               "graphic_designer", "web_developer", "academic_service_worker", "technician")


def _is_staff(user: User) -> bool:
    return user.role in STAFF_ROLES


async def _decorate_request(req: QuotationRequest, db: AsyncSession) -> QuotationRequest:
    svc = (await db.execute(select(Service.name).where(Service.id == req.service_id))).first()
    req._service_name = svc[0] if svc else "General"
    cust = (await db.execute(
        select(User.first_name, User.last_name).where(User.id == req.customer_id))).first()
    req._customer_name = f"{cust[0]} {cust[1]}".strip() if cust else ""
    return req


def _as_request_out(req: QuotationRequest) -> QuotationRequestOut:
    return QuotationRequestOut(
        id=req.id,
        request_number=req.request_number,
        customer_id=req.customer_id,
        service_id=req.service_id,
        service_name=getattr(req, "_service_name", None),
        customer_name=getattr(req, "_customer_name", None),
        description=req.description,
        requirements=req.requirements,
        files=req.files,
        deadline=req.deadline,
        budget=req.budget,
        status=req.status,
        created_at=req.created_at,
    )


async def _can_see_request(user: User, req: QuotationRequest) -> bool:
    return _is_staff(user) or req.customer_id == user.id


# ---------------- Requests ----------------

@router.post("/requests", response_model=QuotationRequestOut, status_code=201)
async def create_request(
    data: QuotationRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = (await db.execute(select(Service).where(Service.id == data.service_id))).scalar_one_or_none()
    if not svc or not svc.is_active:
        raise HTTPException(status_code=404, detail="Service not found")
    n = (await db.execute(select(func.count()).select_from(QuotationRequest))).scalar() + 1
    req = QuotationRequest(
        request_number=f"QR-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{n:03d}",
        customer_id=current_user.id,
        service_id=data.service_id,
        description=data.description,
        requirements=data.requirements,
        files=data.files,
        deadline=data.deadline,
        budget=data.budget,
        status="open",
    )
    db.add(req)
    await db.flush()
    await log_action(db, "quotation_requested", current_user.id, "quotation_requests", req.id,
                     new_values={"service_id": str(data.service_id), "request_number": req.request_number})
    await db.commit()
    await db.refresh(req)
    await _decorate_request(req, db)
    return _as_request_out(req)


@router.get("/requests", response_model=List[QuotationRequestOut])
async def list_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(QuotationRequest)
    if not _is_staff(current_user):
        query = query.where(QuotationRequest.customer_id == current_user.id)
    if status:
        query = query.where(QuotationRequest.status == status)
    query = query.order_by(desc(QuotationRequest.created_at))
    result = await db.execute(query)
    rows = result.scalars().all()
    out = []
    for r in rows:
        await _decorate_request(r, db)
        out.append(_as_request_out(r))
    return out


@router.get("/requests/{request_id}", response_model=QuotationRequestOut)
async def get_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = (await db.execute(select(QuotationRequest).where(QuotationRequest.id == request_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not await _can_see_request(current_user, req):
        raise HTTPException(status_code=403, detail="Not your quotation request")
    await _decorate_request(req, db)
    return _as_request_out(req)


@router.patch("/requests/{request_id}/cancel", response_model=QuotationRequestOut)
async def cancel_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = (await db.execute(select(QuotationRequest).where(QuotationRequest.id == request_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your quotation request")
    if req.status not in ("open", "request_change"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a request that is {req.status}")
    req.status = "cancelled"
    await db.commit()
    await db.refresh(req)
    await _decorate_request(req, db)
    return _as_request_out(req)


# ---------------- Quotes ----------------

@router.post("", response_model=QuotationOut, status_code=201, dependencies=[Depends(require_roles(*STAFF_ROLES))])
async def create_quotation(
    data: QuotationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = (await db.execute(select(QuotationRequest).where(QuotationRequest.id == data.request_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status == "cancelled":
        raise HTTPException(status_code=400, detail="Request is cancelled")
    req.status = "quoted"

    prev = (await db.execute(select(Quotation).where(
        Quotation.request_id == req.id,
        Quotation.status.in_(["pending", "change_requested"]),
    ))).scalars().all()
    for p in prev:
        p.status = "superseded"

    items = []
    subtotal = 0.0
    for it in data.items:
        line = it.quantity * it.unit_price
        subtotal += line
        items.append(QuotationItem(
            title=it.title, description=it.description, quantity=it.quantity,
            unit_price=it.unit_price, total_price=line,
        ))
    total = subtotal + data.delivery_fee + data.tax - data.discount

    n = (await db.execute(select(func.count()).select_from(Quotation))).scalar() + 1
    quote = Quotation(
        quotation_number=f"QT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{n:03d}",
        request_id=req.id,
        created_by=current_user.id,
        note=data.note,
        discount=data.discount,
        delivery_fee=data.delivery_fee,
        tax=data.tax,
        valid_until=data.valid_until,
        status="pending",
        subtotal=subtotal,
        total=total,
        items=items,
    )
    db.add(quote)
    await db.commit()
    quote = (await db.execute(select(Quotation)
             .options(selectinload(Quotation.items))
             .where(Quotation.id == quote.id))).scalar_one()
    await create_notification(db, req.customer_id, "Quotation ready",
                              f"A quotation for your request {req.request_number} is ready.",
                              type="system", data={"quotation_id": str(quote.id)})
    await db.commit()
    return quote


@router.post("/{quotation_id}/accept", response_model=QuotationOut)
async def accept_quotation(
    quotation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quote = (await db.execute(select(Quotation)
              .options(selectinload_items())
              .where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    req = (await db.execute(select(QuotationRequest).where(QuotationRequest.id == quote.request_id))).scalar_one_or_none()
    if quote.status != "pending":
        raise HTTPException(status_code=400, detail=f"Quotation is {quote.status}")
    if req.customer_id != current_user.id and not _is_staff(current_user):
        raise HTTPException(status_code=403, detail="Not your quotation")

    # supersede previous accepted/change quotes for the request
    others = (await db.execute(select(Quotation).where(
        Quotation.request_id == req.id, Quotation.id != quote.id,
        Quotation.status.in_(["pending", "accepted", "change_requested"]),
    ))).scalars().all()
    for o in others:
        if o.status == "accepted":
            raise HTTPException(status_code=400, detail="Request already has an accepted quotation")
        o.status = "superseded"

    quote.status = "accepted"
    req.status = "accepted"

    order = Order(
        order_number=generate_order_number(),
        customer_id=req.customer_id,
        status=OrderStatus.PENDING,
        subtotal=quote.subtotal,
        delivery_fee=quote.delivery_fee,
        tax=quote.tax,
        discount=quote.discount,
        total=quote.total,
        customer_notes=f"From quotation {quote.quotation_number}",
    )
    db.add(order)
    await db.flush()
    svc = (await db.execute(select(Service).where(Service.id == req.service_id))).scalar_one()
    db.add(OrderItem(
        order_id=order.id, service_id=svc.id, service_name=svc.name,
        quantity=1, unit_price=quote.total, total_price=quote.total,
        custom_options={"from_quotation": quote.quotation_number},
    ))
    db.add(OrderStatusHistory(order_id=order.id, to_status=OrderStatus.PENDING, changed_by=current_user.id))
    await log_action(db, "quotation_accepted", current_user.id, "quotations", quote.id,
                     new_values={"order_number": order.order_number, "total": quote.total})
    await create_notification(db, req.customer_id, "Quotation accepted",
                              f"Your quotation {quote.quotation_number} was accepted and an order was created.",
                              type="system", data={"order_number": order.order_number})
    await db.commit()
    await db.refresh(quote)
    quote.order_number = order.order_number
    return quote


@router.post("/{quotation_id}/reject", response_model=QuotationOut)
async def reject_quotation(
    quotation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quote, req = await _load_quote(quotation_id, db)
    if quote.status != "pending":
        raise HTTPException(status_code=400, detail=f"Quotation is {quote.status}")
    if req.customer_id != current_user.id and not _is_staff(current_user):
        raise HTTPException(status_code=403, detail="Not your quotation")
    quote.status = "rejected"
    req.status = "request_change"
    await log_action(db, "quotation_rejected", current_user.id, "quotations", quote.id)
    await db.commit()
    await db.refresh(quote)
    return quote


@router.post("/{quotation_id}/change", response_model=QuotationOut)
async def request_change(
    quotation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quote, req = await _load_quote(quotation_id, db)
    if quote.status != "pending":
        raise HTTPException(status_code=400, detail=f"Quotation is {quote.status}")
    if req.customer_id != current_user.id and not _is_staff(current_user):
        raise HTTPException(status_code=403, detail="Not your quotation")
    quote.status = "change_requested"
    req.status = "request_change"
    await log_action(db, "quotation_change_requested", current_user.id, "quotations", quote.id)
    await db.commit()
    await db.refresh(quote)
    return quote


async def _load_quote(quotation_id: UUID, db: AsyncSession):
    quote = (await db.execute(select(Quotation)
              .options(selectinload_items())
              .where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    req = (await db.execute(select(QuotationRequest).where(QuotationRequest.id == quote.request_id))).scalar_one_or_none()
    return quote, req


def selectinload_items():
    from sqlalchemy.orm import selectinload
    return selectinload(Quotation.items)


@router.get("", response_model=List[QuotationOut])
async def list_quotations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    query = (select(Quotation)
             .options(selectinload(Quotation.items))
             .order_by(desc(Quotation.created_at)))
    if current_user.role == "customer":
        query = query.join(QuotationRequest, QuotationRequest.id == Quotation.request_id) \
                     .where(QuotationRequest.customer_id == current_user.id)
    result = await db.execute(query)
    quotes = result.scalars().all()
    out = []
    for q in quotes:
        req = (await db.execute(select(QuotationRequest).where(QuotationRequest.id == q.request_id))).scalar_one_or_none()
        if req:
            await _decorate_request(req, db)
            q.order_number = None
            q.service_name = getattr(req, "_service_name", None)
        out.append(q)
    return out