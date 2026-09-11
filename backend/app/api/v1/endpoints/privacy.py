"""Privacy centre endpoints: purposes, consents, export, deletion, audit (spec §59).

Privacy by design:
- purpose list with required/optional flags and per-purpose data + retention
- explicit consent per purpose (granted/revoked), recorded in a consent table
- sensitive fields are masked on output (NIN/BVN/SNIN-style data never exposed raw)
- every cross-entity access is recorded to a data-access audit trail
- self-service data export (their own data only) and deletion request flow
- admin: prune expired soft-deleted accounts, list access audit, manage purposes
"""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.services.audit import log_action
from app.services.privacy import mask, mask_email, ensure_default_purposes
from app.models.user import User
from app.models.privacy import DataPurpose, DataConsent, PrivacyRequest, DataAccessAudit
from app.models.order import Order, OrderMessage
from app.models.support import SupportTicket
from app.models.finance import Wallet, WalletTransaction
from app.models.notification import IdentityServiceRecord
from app.schemas.privacy import (
    DataPurposeOut, DataConsentOut, DataConsentUpdate,
    PrivacyRequestCreate, PrivacyRequestProcess, PrivacyRequestOut,
    DataExportOut, AuditOut,
)

router = APIRouter(prefix="/privacy", tags=["privacy"])

VALID_REQUEST_TYPES = ("data_export", "data_deletion")


# --------------------------- Purposes ---------------------------

@router.get("/purposes", response_model=list)
async def list_purposes(db=Depends(get_db)):
    await ensure_default_purposes(db)
    items = (await db.execute(select(DataPurpose).where(DataPurpose.is_active.is_(True)).order_by(DataPurpose.purpose_code))).scalars().all()
    return [DataPurposeOut.model_validate(p) for p in items]


@router.post("/purposes", response_model=DataPurposeOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_purpose(data: dict, db=Depends(get_db)):
    purpose = DataPurpose(
        purpose_code=data.get("purpose_code"),
        title=data.get("title"),
        description=data.get("description"),
        data_collected=data.get("data_collected") or [],
        retention_days=data.get("retention_days") or 30,
        is_required=bool(data.get("is_required")),
        is_active=data.get("is_active", True),
    )
    db.add(purpose)
    await db.commit()
    await db.refresh(purpose)
    return purpose


@router.patch("/purposes/{purpose_code}", response_model=DataPurposeOut, dependencies=[Depends(require_admin)])
async def update_purpose(purpose_code: str, data: dict, db=Depends(get_db)):
    purpose = (await db.execute(select(DataPurpose).where(DataPurpose.purpose_code == purpose_code))).scalars().first()
    if not purpose:
        raise HTTPException(404, "Purpose not found")
    if "retention_days" in data:
        days = data["retention_days"]
        if not isinstance(days, int) or not (7 <= days <= 3650):
            raise HTTPException(422, "retention_days must be between 7 and 3650")
        purpose.retention_days = days
    if "is_active" in data:
        purpose.is_active = bool(data["is_active"])
    if "title" in data:
        purpose.title = data["title"]
    if "description" in data:
        purpose.description = data["description"]
    if "data_collected" in data:
        purpose.data_collected = data["data_collected"]
    await db.commit()
    await db.refresh(purpose)
    return purpose


# --------------------------- Consents ---------------------------

@router.get("/consents", response_model=list)
async def my_consents(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    await ensure_default_purposes(db)
    purposes = (await db.execute(select(DataPurpose).where(DataPurpose.is_active.is_(True)))).scalars().all()
    rows = (await db.execute(select(DataConsent).where(DataConsent.user_id == current_user.id))).scalars().all()
    granted = {c.purpose_code: c.granted for c in rows}
    out = []
    for p in purposes:
        out.append({
            "purpose_code": p.purpose_code,
            "title": p.title,
            "granted": granted.get(p.purpose_code, p.is_required),
            "is_required": p.is_required,
        })
    return out


@router.put("/consents/{purpose_code}", response_model=dict)
async def update_consent(purpose_code: str, data: DataConsentUpdate, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    purpose = (await db.execute(select(DataPurpose).where(DataPurpose.purpose_code == purpose_code))).scalars().first()
    if not purpose or not purpose.is_active:
        raise HTTPException(404, "Purpose not found")
    if purpose.is_required and not data.granted:
        raise HTTPException(400, "This purpose is required and cannot be revoked")
    row = (await db.execute(select(DataConsent).where(
        DataConsent.user_id == current_user.id, DataConsent.purpose_code == purpose_code
    ))).scalars().first()
    if not row:
        db.add(DataConsent(user_id=current_user.id, purpose_code=purpose_code, granted=data.granted))
    else:
        row.granted = data.granted
    await db.commit()
    await log_action(db, "consent_updated", current_user.id, "data_purposes", purpose.id,
                     new_values={"purpose_code": purpose_code, "granted": data.granted})
    return {"purpose_code": purpose_code, "granted": data.granted}


# --------------------------- Self-service export ---------------------------

async def _export_for(db: AsyncSession, user: User) -> DataExportOut:
    orders = (await db.execute(select(Order).where(Order.customer_id == user.id).order_by(Order.created_at.desc()))).scalars().all()
    messages = (await db.execute(select(OrderMessage).where(OrderMessage.sender_id == user.id).order_by(OrderMessage.created_at.desc()))).scalars().all()
    tickets = (await db.execute(select(SupportTicket).where(SupportTicket.customer_id == user.id).order_by(SupportTicket.created_at.desc()))).scalars().all()
    wallet_id = (await db.execute(select(Wallet.id).where(Wallet.user_id == user.id))).scalar_one_or_none()
    wallet_txns = (await db.execute(select(WalletTransaction).where(WalletTransaction.wallet_id == wallet_id)
                                   .order_by(WalletTransaction.created_at.desc()))).scalars().all() if wallet_id else []
    consents = (await db.execute(select(DataConsent).where(DataConsent.user_id == user.id))).scalars().all()

    return DataExportOut(
        user={
            "first_name": user.first_name, "last_name": user.last_name,
            "email": user.email, "phone": user.phone,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        },
        consents=[{"purpose_code": c.purpose_code, "granted": c.granted} for c in consents],
        orders=[{"order_number": o.order_number, "status": str(o.status.value), "total": o.total,
                 "created_at": o.created_at.isoformat() if o.created_at else None} for o in orders],
        messages=[{"content": m.message, "created_at": m.created_at.isoformat() if m.created_at else None} for m in messages],
        support_tickets=[{"ticket_number": t.ticket_number, "subject": t.subject, "status": str(t.status.value)} for t in tickets],
        wallet_transactions=[{"reference": w.reference, "type": w.type, "amount": w.amount,
                             "created_at": w.created_at.isoformat() if w.created_at else None} for w in wallet_txns],
        generated_at=datetime.utcnow().isoformat(),
        expires_in_days=7,
    )


@router.get("/export", response_model=DataExportOut)
async def export_my_data(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    """Export the customer's own data (self-service)."""
    await ensure_default_purposes(db)
    data = await _export_for(db, current_user)
    await log_action(db, "data_export", current_user.id, None, None, new_values={"kind": "self"})
    await db.commit()
    return data


# --------------------------- Deletion requests ---------------------------

@router.post("/requests", response_model=PrivacyRequestOut, status_code=201)
async def create_request(data: PrivacyRequestCreate, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.request_type not in VALID_REQUEST_TYPES:
        raise HTTPException(422, f"request_type must be one of {VALID_REQUEST_TYPES}")
    req = PrivacyRequest(
        request_number=f"PRIV-{uuid.uuid4().hex[:8].upper()}",
        user_id=current_user.id,
        request_type=data.request_type,
        status="pending",
        reason=data.reason,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    await log_action(db, f"{data.request_type}_requested", current_user.id, "privacy_requests", req.id)
    return req


@router.get("/requests", response_model=list)
async def list_requests(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("super_admin", "business_owner", "admin", "manager", "staff"):
        rows = (await db.execute(select(PrivacyRequest).where(PrivacyRequest.user_id == current_user.id).order_by(PrivacyRequest.requested_at.desc()))).scalars().all()
    else:
        rows = (await db.execute(select(PrivacyRequest).order_by(PrivacyRequest.requested_at.desc()))).scalars().all()
    return [PrivacyRequestOut.model_validate(r) for r in rows]


@router.post("/requests/{request_id}/process", response_model=PrivacyRequestOut, dependencies=[Depends(require_admin)])
async def process_request(request_id: uuid.UUID, data: PrivacyRequestProcess, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    req = (await db.execute(select(PrivacyRequest).where(PrivacyRequest.id == request_id))).scalars().first()
    if not req:
        raise HTTPException(404, "Privacy request not found")
    if req.status in ("completed", "denied"):
        raise HTTPException(400, f"Request already {req.status}")
    if data.action not in ("approve", "deny"):
        raise HTTPException(422, "action must be approve or deny")
    target = (await db.execute(select(User).where(User.id == req.user_id))).scalars().first()
    if data.action == "approve" and req.request_type.value == "data_deletion":
        # soft-delete the account so it is excluded from new auth/logins
        if target:
            target.deleted_at = datetime.utcnow()
            target.is_active = False
        req.status = "completed"
    elif data.action == "approve":
        req.status = "completed"
    else:
        req.status = "denied"
    req.processed_by = current_user.id
    req.processed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(req)
    await log_action(db, f"privacy_request_{data.action}", current_user.id, "privacy_requests", req.id,
                     new_values={"status": req.status})
    return req


# --------------------------- Admin audit + hard deletion ---------------------------

@router.get("/audit", response_model=list)
async def list_audit(limit: int = Query(50, ge=1, le=500), db=Depends(get_db), current_user: User = Depends(get_current_user)):
    q = select(DataAccessAudit)
    if current_user.role not in ("super_admin", "business_owner", "admin", "manager", "staff"):
        q = q.where(DataAccessAudit.target_user_id == current_user.id)
    rows = (await db.execute(q.order_by(desc(DataAccessAudit.created_at)).limit(limit))).scalars().all()
    return [AuditOut.model_validate(r) for r in rows]


@router.get("/mask", response_model=dict, dependencies=[Depends(require_admin)])
async def mask_preview(value: str = Query(..., min_length=1), db=Depends(get_db)):
    """Preview masking of a sensitive value (used to demonstrate the masking rules)."""
    return {"original": value, "masked": mask(value)}


@router.post("/prune", response_model=dict, dependencies=[Depends(require_admin)])
async def prune_expired(db=Depends(get_db)):
    """Hard-delete users soft-deleted beyond their retention window (once a purpose/consent
    shows retention expired). This is the deliberate deletion process.
    """
    cutoff = datetime.utcnow() - timedelta(days=31)
    users = (await db.execute(select(User).where(User.deleted_at.is_not(None), User.deleted_at < cutoff))).scalars().all()
    ids = [u.id for u in users]
    # Purge their identity / consent / request rows
    if ids:
        for m in (IdentityServiceRecord, DataConsent, DataAccessAudit):
            await db.execute(m.__table__.delete().where(m.__table__.c.user_id.in_(ids)))
        await db.execute(PrivacyRequest.__table__.delete().where(PrivacyRequest.__table__.c.user_id.in_(ids)))
        for u in users:
            await db.delete(u)
        await db.commit()
    return {"pruned": len(ids)}


# --------------------------- Log helper ---------------------------

async def record_access(db: AsyncSession, actor: User, target: User, action: str, entity=None):
    db.add(DataAccessAudit(
        target_user_id=target.id,
        actor_id=actor.id,
        action=action,
        entity_type=entity.__class__.__name__ if entity else None,
        entity_id=getattr(entity, "id", None),
    ))
    await db.flush()