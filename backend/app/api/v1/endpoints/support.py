"""Support centre endpoints: tickets, messages, refund decisions, FAQ (spec §57)."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.services.audit import log_action
from app.models.user import User
from app.models.support import SupportTicket, SupportMessage, FAQ
from app.models.order import Order
from app.schemas.support import (
    FAQCreate, FAQOut, FAQUpdate,
    SupportEscalateIn, SupportMessageIn, SupportMessageOut,
    SupportRefundDecisionIn, SupportTicketCreate, SupportTicketOut,
    SupportTicketStatusUpdate,
)

router = APIRouter(prefix="/support", tags=["support"])

STAFF_ROLES = ("super_admin", "business_owner", "admin", "manager", "staff",
               "printing_operator", "graphic_designer", "web_developer",
               "academic_service_worker", "technician", "delivery_person",
               "partner_freelancer")

VALID_STATUSES = ("open", "in_progress", "waiting_customer", "resolved", "closed")
VALID_CATEGORIES = ("general", "order_dispute", "refund_request", "escalation")
VALID_PRIORITIES = ("low", "medium", "high")
VALID_REFUND_DECISIONS = ("approved", "denied")


def _is_staff(user: User) -> bool:
    return user.role in STAFF_ROLES


def ticket_query():
    return (select(SupportTicket).options(selectinload(SupportTicket.messages)))


def _decorate(t: SupportTicket, user_map: dict, order_map: dict) -> SupportTicket:
    names = user_map.get(t.customer_id)
    if names:
        t.__dict__["customer_name"] = ((names["first_name"] or "") + " " + (names["last_name"] or "")).strip() or str(names["email"])
    t.__dict__["order_number"] = order_map.get(t.order_id)
    for m in t.messages:
        sender = user_map.get(m.sender_id)
        if sender:
            m.__dict__["sender_name"] = "Support Team" if m.sender_role == "staff" else \
                (((sender["first_name"] or "") + " " + (sender["last_name"] or "")).strip() or str(sender["email"]))
    return t


async def _decorate_for_view(db, t: SupportTicket) -> SupportTicket:
    """Load the users + order associated with a ticket and decorate it for output."""
    ids = {t.customer_id}
    ids.update(m.sender_id for m in t.messages)
    users = (await db.execute(select(User).where(User.id.in_(ids)))).scalars().all()
    user_map = {u.id: {"first_name": u.first_name, "last_name": u.last_name, "email": u.email} for u in users}
    order_map = {}
    if t.order_id:
        order = (await db.execute(select(Order.id, Order.order_number).where(Order.id == t.order_id))).first()
        if order:
            order_map = {order[0]: order[1]}
    return _decorate(t, user_map, order_map)


async def _get_own_or_all(db, current_user: User, status: str = None) -> list:
    q = ticket_query()
    if not _is_staff(current_user):
        q = q.where(SupportTicket.customer_id == current_user.id)
    if status:
        q = q.where(SupportTicket.status == status)
    tickets = (await db.execute(q.order_by(SupportTicket.created_at.desc()))).scalars().all()
    user_ids = {t.customer_id for t in tickets}
    user_ids.update(m.sender_id for t in tickets for m in t.messages)
    users = (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
    user_map = {u.id: {"first_name": u.first_name, "last_name": u.last_name, "email": u.email} for u in users}
    order_map = {}
    order_ids = {t.order_id for t in tickets if t.order_id}
    if order_ids:
        orders = (await db.execute(select(Order.id, Order.order_number).where(Order.id.in_(order_ids)))).all()
        order_map = {o[0]: o[1] for o in orders}
    for t in tickets:
        _decorate(t, user_map, order_map)
    return tickets


# --------------------------- FAQ ---------------------------

@router.get("/faqs", response_model=list, dependencies=[Depends(get_current_user)])
async def list_faqs(db=Depends(get_db)):
    items = (await db.execute(select(FAQ).where(FAQ.is_active.is_(True)).order_by(FAQ.id))).scalars().all()
    return [FAQOut.model_validate(f) for f in items]


@router.post("/faqs", response_model=FAQOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_faq(data: FAQCreate, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    faq = FAQ(question=data.question, answer=data.answer,
              category=data.category or "general", is_active=data.is_active)
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    await log_action(db, "faq_created", current_user.id, "support_faqs", faq.id)
    return faq


@router.patch("/faqs/{faq_id}", response_model=FAQOut, dependencies=[Depends(require_admin)])
async def update_faq(faq_id: uuid.UUID, data: FAQUpdate, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    faq = (await db.execute(select(FAQ).where(FAQ.id == faq_id))).scalars().first()
    if not faq:
        raise HTTPException(404, "FAQ not found")
    for f, val in data.model_dump(exclude_unset=True).items():
        setattr(faq, f, val)
    await db.commit()
    await db.refresh(faq)
    await log_action(db, "faq_updated", current_user.id, "support_faqs", faq.id)
    return faq


# --------------------------- Tickets ---------------------------

@router.post("/tickets", response_model=SupportTicketOut, status_code=201)
async def create_ticket(data: SupportTicketCreate, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.category not in VALID_CATEGORIES:
        raise HTTPException(422, f"category must be one of {VALID_CATEGORIES}")
    if data.priority not in VALID_PRIORITIES:
        raise HTTPException(422, f"priority must be one of {VALID_PRIORITIES}")
    if data.order_id:
        order = (await db.execute(select(Order).where(Order.id == data.order_id))).scalars().first()
        if not order:
            raise HTTPException(404, "Order not found")
        if order.customer_id != current_user.id and not _is_staff(current_user):
            raise HTTPException(403, "This order belongs to another customer")
    ticket = SupportTicket(
        ticket_number=f"TK-{uuid.uuid4().hex[:8].upper()}",
        customer_id=current_user.id,
        order_id=data.order_id,
        subject=data.subject,
        category=data.category,
        priority=data.priority,
        status="open",
        description=data.description,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    await log_action(db, "support_ticket_created", current_user.id, "support_tickets", ticket.id)
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket.id))).scalars().first()
    return await _decorate_for_view(db, t)


@router.get("/tickets", response_model=list)
async def list_tickets(status: str = None, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if status and status not in VALID_STATUSES:
        raise HTTPException(422, f"status must be one of {VALID_STATUSES}")
    tickets = await _get_own_or_all(db, current_user, status)
    return [SupportTicketOut.model_validate(t) for t in tickets]


@router.get("/tickets/{ticket_id}", response_model=SupportTicketOut)
async def get_ticket(ticket_id: uuid.UUID, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    if t.customer_id != current_user.id and not _is_staff(current_user):
        raise HTTPException(403, "Not your ticket")
    return await _decorate_for_view(db, t)


@router.post("/tickets/{ticket_id}/messages", response_model=SupportTicketOut)
async def add_message(ticket_id: uuid.UUID, data: SupportMessageIn, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    is_owner = t.customer_id == current_user.id
    if not is_owner and not _is_staff(current_user):
        raise HTTPException(403, "Not your ticket")
    if is_owner and t.status == "closed":
        raise HTTPException(400, "Ticket is closed. Contact support to reopen.")
    msg = SupportMessage(
        ticket_id=t.id,
        sender_id=current_user.id,
        sender_role="customer" if not _is_staff(current_user) else "staff",
        body=data.body,
    )
    if _is_staff(current_user):
        if t.status in ("open", "waiting_customer", "resolved"):
            t.status = "in_progress"
    else:
        if t.status == "waiting_customer":
            t.status = "open"
    db.add(msg)
    await db.commit()
    await db.refresh(t)
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    return await _decorate_for_view(db, t)


@router.patch("/tickets/{ticket_id}/status", response_model=SupportTicketOut)
async def update_status(ticket_id: uuid.UUID, data: SupportTicketStatusUpdate, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.status not in VALID_STATUSES:
        raise HTTPException(422, f"status must be one of {VALID_STATUSES}")
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    is_owner = t.customer_id == current_user.id
    if not is_owner and not _is_staff(current_user):
        raise HTTPException(403, "Not your ticket")
    if is_owner and data.status not in ("resolved", "closed"):
        raise HTTPException(403, "Customers may only resolve or close their own tickets")
    if data.status == t.status:
        raise HTTPException(400, f"Ticket is already {t.status}")
    t.status = data.status
    if data.status == "resolved":
        t.resolved_at = datetime.utcnow()
    if data.status == "closed":
        t.closed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(t)
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    await log_action(db, "support_ticket_status", current_user.id, "support_tickets", t.id,
                     new_values={"status": data.status})
    return await _decorate_for_view(db, t)


@router.post("/tickets/{ticket_id}/escalate", response_model=SupportTicketOut)
async def escalate(ticket_id: uuid.UUID, data: SupportEscalateIn = SupportEscalateIn(), db=Depends(get_db), current_user: User = Depends(get_current_user)):
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    if t.customer_id != current_user.id and not _is_staff(current_user):
        raise HTTPException(403, "Not your ticket")
    if t.is_escalated:
        raise HTTPException(400, "Ticket already escalated")
    t.is_escalated = True
    t.escalation_reason = data.reason if data.reason else None
    await db.commit()
    await db.refresh(t)
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    await log_action(db, "support_ticket_escalated", current_user.id, "support_tickets", t.id)
    return await _decorate_for_view(db, t)


@router.patch("/tickets/{ticket_id}/refund", response_model=SupportTicketOut, dependencies=[Depends(require_admin)])
async def refund_decision(ticket_id: uuid.UUID, data: SupportRefundDecisionIn, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.decision not in VALID_REFUND_DECISIONS:
        raise HTTPException(422, "decision must be approved or denied")
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    if not t:
        raise HTTPException(404, "Ticket not found")
    t.refund_decision = data.decision
    t.refund_amount = data.amount
    if t.status != "closed":
        t.status = "resolved"
        t.resolved_at = datetime.utcnow()
    await db.commit()
    await db.refresh(t)
    t = (await db.execute(ticket_query().where(SupportTicket.id == ticket_id))).scalars().first()
    await log_action(db, "support_refund_decision", current_user.id, "support_tickets", t.id,
                     new_values={"decision": data.decision, "amount": data.amount})
    return await _decorate_for_view(db, t)