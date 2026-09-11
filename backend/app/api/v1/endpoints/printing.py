"""Printing endpoints: create print jobs, queue, status, file upload."""
from typing import List, Optional
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.order import Order
from app.models.cybercafe import PrintJob
from app.models.finance import Wallet, Transaction, WalletTransaction
from app.models.enums import PaymentStatus, PaymentMethod
from app.models.file import File as FileModel
from app.services.audit import log_action
from app.services.file_storage import save_upload
from app.services.order_number import generate_reference
from app.schemas.cafe import PrintJobCreate, PrintJobOut

router = APIRouter(prefix="/printing", tags=["printing"])

# Print pricing (per copy of one page, in naira) — editable business config.
PRINT_RATES = {
    "bw": 50.0,
    "color": 150.0,
}
BINDING_FEE = 500.0     # if a binding_type is requested
LAMINATION_FEE = 200.0  # per job if lamination is requested


def compute_print_amount(data) -> float:
    page_rate = PRINT_RATES.get(data.color_mode, PRINT_RATES["bw"])
    amount = page_rate * data.total_pages * data.copies
    if data.binding_type:
        amount += BINDING_FEE
    if data.lamination:
        amount += LAMINATION_FEE
    return round(amount, 2)


@router.post("/jobs", response_model=PrintJobOut, status_code=201)
async def create_print_job(
    data: PrintJobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a print job (linked to a file upload or an existing order)."""
    job = PrintJob(
        order_id=data.order_id,
        file_name=data.file_name,
        total_pages=data.total_pages,
        copies=data.copies,
        color_mode=data.color_mode,
        paper_size=data.paper_size,
        binding_type=data.binding_type,
        lamination=data.lamination,
        notes=data.notes,
        status="pending",
        total_amount=compute_print_amount(data),
    )
    db.add(job)
    await log_action(db, "print_job_created", current_user.id, "print_jobs", job.id,
                     new_values={"file_name": job.file_name, "pages": job.total_pages * job.copies})
    await db.commit()
    await db.refresh(job)
    return job


@router.post("/jobs/{job_id}/file", status_code=201)
async def upload_print_file(
    job_id: UUID,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PrintJob).where(PrintJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")

    saved = []
    for upload in files:
        meta = await save_upload(upload)
        file_model = FileModel(
            uploaded_by=current_user.id,
            original_name=meta["original_name"],
            stored_name=meta["stored_name"],
            mime_type=meta["mime_type"],
            file_size=meta["file_size"],
            file_path=meta["stored_relative"],
        )
        db.add(file_model)
        await db.flush()
        job.file_id = file_model.id
        saved.append(meta)

    await log_action(db, "print_file_uploaded", current_user.id, "print_jobs", job.id,
                     new_values={"count": len(saved)})
    await db.commit()
    return {"uploaded": len(saved), "files": saved, "job_id": str(job.id)}


@router.get("/jobs", response_model=List[PrintJobOut])
async def list_print_jobs(
    status: Optional[str] = None,
    mine: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(PrintJob).order_by(PrintJob.created_at.desc())
    if status:
        query = query.where(PrintJob.status == status)
    if mine and current_user.role != "customer":
        # staff see their own; customers default to mine
        pass
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/queue", response_model=List[PrintJobOut])
async def print_queue(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PrintJob).where(PrintJob.status.in_(["pending", "printing"])).order_by(PrintJob.created_at)
    )
    return result.scalars().all()


@router.patch("/jobs/{job_id}/status", response_model=PrintJobOut)
async def update_print_status(
    job_id: UUID,
    payload: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PrintJob).where(PrintJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")

    new_status = payload.get("status")
    allowed = {"pending", "printing", "completed", "cancelled", "failed"}
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    job.status = new_status
    if new_status == "completed" and job.completed_at is None:
        job.completed_at = datetime.now(timezone.utc)

    await log_action(db, "print_job_status", current_user.id, "print_jobs", job.id,
                     new_values={"status": new_status})
    await db.commit()
    await db.refresh(job)
    return job


@router.post("/jobs/{job_id}/pay", response_model=dict)
async def pay_print_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pay for a completed print job from the customer's wallet."""
    result = await db.execute(select(PrintJob).where(PrintJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Print job must be completed before paying")
    if job.is_paid:
        raise HTTPException(status_code=400, detail="Print job already paid")

    amount = job.total_amount or 0
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Print job has no charge")

    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))).scalar_one_or_none()
    if not wallet or wallet.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    wallet.balance = round(wallet.balance - amount, 2)
    job.is_paid = True

    reference = generate_reference("PRT")
    txn = Transaction(
        reference=reference,
        user_id=current_user.id,
        type="printing",
        amount=amount,
        status=PaymentStatus.COMPLETED,
        payment_method=PaymentMethod.WALLET,
        meta={"print_job_id": str(job.id)},
    )
    db.add(txn)
    db.add(WalletTransaction(wallet_id=wallet.id, type="debit", amount=amount, reference=reference))

    await log_action(db, "print_job_paid", current_user.id, "print_jobs", job.id,
                     new_values={"amount": amount, "reference": reference})
    await db.commit()
    return {"print_job_id": str(job.id), "amount": amount, "balance": wallet.balance, "reference": reference}
