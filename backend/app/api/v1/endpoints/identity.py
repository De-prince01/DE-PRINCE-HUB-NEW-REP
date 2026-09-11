"""Identity verification endpoints.

Admin/staff verify a customer's identity documents (NIN / BVN / SNIN) through
an abstracted provider. Results and access are persisted to
IdentityServiceRecord so we keep an honest audit trail.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.notification import IdentityServiceRecord
from app.models.privacy import DataAccessAudit
from app.services.identity import gateway, dev_encode
from app.services.order_number import generate_reference

router = APIRouter(prefix="/identity", tags=["identity"])


class VerifyRequest(BaseModel):
    id_type: str = Field(..., description="Document type: NIN, BVN or SNIN")
    id_number: str = Field(..., min_length=4, max_length=20)
    customer_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class VerifyResponse(BaseModel):
    verified: bool
    provider: str
    id_type: str
    masked_id: str
    full_name: Optional[str]
    date_of_birth: Optional[str]
    message: str
    record_id: Optional[str] = None


@router.post("/verify", response_model=VerifyResponse)
async def verify_identity(
    payload: VerifyRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Verify an identity document for a customer and record the attempt."""
    id_type = payload.id_type.upper()
    if id_type not in ("NIN", "BVN", "SNIN"):
        raise HTTPException(status_code=422, detail="id_type must be NIN, BVN or SNIN")

    customer = None
    if payload.customer_id:
        result = await db.execute(select(User).where(User.id == payload.customer_id))
        customer = result.scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

    result_rec = await gateway.verify(
        id_type,
        payload.id_number,
        first_name=payload.first_name,
        last_name=payload.last_name,
        expected_name=customer and f"{customer.first_name or ''} {customer.last_name or ''}".strip() or None,
    )

    record = IdentityServiceRecord(
        order_id=payload.order_id,
        customer_id=payload.customer_id or (customer.id if customer else current_user.id),
        service_type=f"identity_{id_type.lower()}_verification",
        provider=result_rec.provider,
        data_encrypted=dev_encode(f"{id_type}:{payload.id_number}:{result_rec.verified}"),
        access_log=[
            {
                "action": "verify",
                "by": str(current_user.id),
                "id_type": id_type,
                "verified": result_rec.verified,
                "provider": result_rec.provider,
            }
        ],
        retention_days=30,
    )
    db.add(record)
    await db.flush()
    db.add(DataAccessAudit(
        target_user_id=record.customer_id,
        actor_id=current_user.id,
        action=f"identity_{id_type.lower()}_verified",
        entity_type="IdentityServiceRecord",
        entity_id=record.id,
        details={"verified": result_rec.verified, "provider": result_rec.provider,
                 "masked_id": result_rec.masked_id},
    ))
    await db.commit()
    await db.refresh(record)

    return VerifyResponse(
        verified=result_rec.verified,
        provider=result_rec.provider,
        id_type=id_type,
        masked_id=result_rec.masked_id,
        full_name=result_rec.full_name,
        date_of_birth=result_rec.date_of_birth,
        message=result_rec.message,
        record_id=str(record.id),
    )


@router.get("/records", response_model=List[dict])
async def list_records(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
):
    """List identity verification records (insurance/audit trail)."""
    result = await db.execute(
        select(IdentityServiceRecord).order_by(desc(IdentityServiceRecord.created_at)).limit(limit)
    )
    records = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "customer_id": str(r.customer_id) if r.customer_id else None,
            "order_id": str(r.order_id) if r.order_id else None,
            "service_type": r.service_type,
            "provider": r.provider,
            "retention_days": r.retention_days,
            "created_at": r.created_at,
            "expires_at": r.expires_at,
            "deleted_at": r.deleted_at,
        }
        for r in records
    ]
