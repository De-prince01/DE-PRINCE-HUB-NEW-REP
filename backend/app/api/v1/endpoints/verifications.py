"""Verification Centre endpoints.

Customers create verification requests and track them via reference codes.
Staff update status, set provider results, and audit everything.

IMPORTANT: verification results are NEVER faked or generated. They come
exclusively from the configured provider pipeline (staff-provided or
third-party API). When no provider is available, the request is simply
in_progress until a human or API completes it.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.verification import VerificationRequest, VerificationProviderConfig
from app.models.service import Service
from app.services.order_number import generate_reference

router = APIRouter(prefix="/verifications", tags=["verifications"])


# ── Customer schemas ──────────────────────────────────────────────────────
class VerificationCreateRequest(BaseModel):
    verification_type: str = Field(
        ..., description="nin | bvn | cac | bank | academic | document | other"
    )
    entity_name: Optional[str] = Field(None, description="Person/business/document label")
    id_number: Optional[str] = Field(None, min_length=3, max_length=100)
    service_id: Optional[UUID] = Field(None, description="Link to the service catalogue")


class VerificationOut(BaseModel):
    id: str
    reference: str
    verification_type: str
    entity_name: Optional[str]
    status: str
    status_message: Optional[str]
    provider: Optional[str]
    amount: float
    is_paid: bool
    result: Optional[dict]
    requested_at: datetime
    completed_at: Optional[datetime]


class VerificationListOut(BaseModel):
    items: List[VerificationOut]
    total: int


# ── Customer: create request ──────────────────────────────────────────────
@router.post("", response_model=VerificationOut)
async def create_verification(
    payload: VerificationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid_types = {"nin", "bvn", "cac", "bank", "academic", "document", "other"}
    vtype = payload.verification_type.lower()
    if vtype not in valid_types:
        raise HTTPException(status_code=422, detail=f"verification_type must be one of {valid_types}")

    # Price from service catalogue (configurable, never hard-coded)
    amount = 0.0
    if payload.service_id:
        svc = await db.execute(select(Service).where(Service.id == payload.service_id))
        svc_row = svc.scalar_one_or_none()
        if svc_row:
            amount = svc_row.base_price

    ref = generate_reference("DP-VER")

    req = VerificationRequest(
        reference=ref,
        customer_id=current_user.id,
        verification_type=vtype,
        entity_name=payload.entity_name,
        id_number=payload.id_number,
        service_id=payload.service_id,
        amount=amount,
        status="submitted",
        requested_at=datetime.utcnow(),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return VerificationOut(
        id=str(req.id),
        reference=req.reference,
        verification_type=req.verification_type,
        entity_name=req.entity_name,
        status=req.status,
        status_message=req.status_message,
        provider=req.provider,
        amount=req.amount,
        is_paid=req.is_paid,
        result=req.result,
        requested_at=req.requested_at,
        completed_at=req.completed_at,
    )


# ── Customer: list my requests ────────────────────────────────────────────
@router.get("", response_model=VerificationListOut)
async def list_my_verifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
):
    q = select(VerificationRequest).where(VerificationRequest.customer_id == current_user.id)
    if status:
        q = q.where(VerificationRequest.status == status)
    q = q.order_by(desc(VerificationRequest.requested_at)).limit(limit).offset(offset)

    result = await db.execute(q)
    items = result.scalars().all()

    # total count
    from sqlalchemy import func
    count_q = select(func.count()).select_from(VerificationRequest).where(
        VerificationRequest.customer_id == current_user.id
    )
    if status:
        count_q = count_q.where(VerificationRequest.status == status)
    total = (await db.execute(count_q)).scalar() or 0

    return VerificationListOut(
        items=[
            VerificationOut(
                id=str(r.id),
                reference=r.reference,
                verification_type=r.verification_type,
                entity_name=r.entity_name,
                status=r.status,
                status_message=r.status_message,
                provider=r.provider,
                amount=r.amount,
                is_paid=r.is_paid,
                result=r.result,
                requested_at=r.requested_at,
                completed_at=r.completed_at,
            )
            for r in items
        ],
        total=total,
    )


# ── Customer: get by reference ────────────────────────────────────────────
@router.get("/{reference}", response_model=VerificationOut)
async def get_verification(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.reference == reference)
    )
    req = result.scalar_one_or_none()
    if not req or req.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Verification request not found")

    return VerificationOut(
        id=str(req.id),
        reference=req.reference,
        verification_type=req.verification_type,
        entity_name=req.entity_name,
        status=req.status,
        status_message=req.status_message,
        provider=req.provider,
        amount=req.amount,
        is_paid=req.is_paid,
        result=req.result,
        requested_at=req.requested_at,
        completed_at=req.completed_at,
    )


# ── Staff: update status / write result ───────────────────────────────────
class StaffUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="submitted | under_review | processing | completed | failed | cancelled")
    status_message: Optional[str] = None
    provider: Optional[str] = None
    provider_reference: Optional[str] = None
    result: Optional[dict] = Field(None, description="Verification result payload — ONLY from provider/staff, never fabricated")
    amount: Optional[float] = None
    is_paid: Optional[bool] = None


@router.patch("/{reference}/staff", response_model=VerificationOut)
async def staff_update_verification(
    reference: str,
    payload: StaffUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VerificationRequest).where(VerificationRequest.reference == reference)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Verification request not found")

    valid_statuses = {"submitted", "under_review", "processing", "completed", "failed", "cancelled"}
    if payload.status:
        if payload.status not in valid_statuses:
            raise HTTPException(status_code=422, detail=f"status must be one of {valid_statuses}")
        req.status = payload.status
        if payload.status == "completed":
            req.completed_at = datetime.utcnow()
    if payload.status_message is not None:
        req.status_message = payload.status_message
    if payload.provider is not None:
        req.provider = payload.provider
    if payload.provider_reference is not None:
        req.provider_reference = payload.provider_reference
    if payload.result is not None:
        req.result = payload.result
    if payload.amount is not None:
        req.amount = payload.amount
    if payload.is_paid is not None:
        req.is_paid = payload.is_paid

    req.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(req)

    return VerificationOut(
        id=str(req.id),
        reference=req.reference,
        verification_type=req.verification_type,
        entity_name=req.entity_name,
        status=req.status,
        status_message=req.status_message,
        provider=req.provider,
        amount=req.amount,
        is_paid=req.is_paid,
        result=req.result,
        requested_at=req.requested_at,
        completed_at=req.completed_at,
    )


# ── Staff: list all (admin dashboard) ─────────────────────────────────────
@router.get("/admin/all", response_model=VerificationListOut)
async def staff_list_all(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    vtype: Optional[str] = Query(None),
):
    q = select(VerificationRequest)
    if status:
        q = q.where(VerificationRequest.status == status)
    if vtype:
        q = q.where(VerificationRequest.verification_type == vtype)
    q = q.order_by(desc(VerificationRequest.requested_at)).limit(limit).offset(offset)

    result = await db.execute(q)
    items = result.scalars().all()

    from sqlalchemy import func
    count_q = select(func.count()).select_from(VerificationRequest)
    if status:
        count_q = count_q.where(VerificationRequest.status == status)
    if vtype:
        count_q = count_q.where(VerificationRequest.verification_type == vtype)
    total = (await db.execute(count_q)).scalar() or 0

    return VerificationListOut(
        items=[
            VerificationOut(
                id=str(r.id),
                reference=r.reference,
                verification_type=r.verification_type,
                entity_name=r.entity_name,
                status=r.status,
                status_message=r.status_message,
                provider=r.provider,
                amount=r.amount,
                is_paid=r.is_paid,
                result=r.result,
                requested_at=r.requested_at,
                completed_at=r.completed_at,
            )
            for r in items
        ],
        total=total,
    )


# ── Provider configs (admin only) ────────────────────────────────────────
@router.get("/admin/providers", response_model=List[dict])
async def list_providers(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(VerificationProviderConfig))
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "display_name": p.display_name,
            "supports_types": p.supports_types,
            "is_enabled": p.is_enabled,
            "requires_secret": p.requires_secret,
        }
        for p in result.scalars().all()
    ]
