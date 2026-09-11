"""Admin banking endpoints: bank catalogue management and payout approvals."""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User
from app.models.bank import Bank, WithdrawalRequest
from app.models.finance import Wallet, WalletTransaction
from app.models.enums import WithdrawalStatus
from app.services.banks import seed_banks, fetch_from_paystack
from app.services.payout import initiate_transfer
from app.services.audit import log_action
from app.schemas.bank import (
    BankAdminOut, BankRefreshOut, WithdrawalOut, WithdrawalAdminUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin-banking"])


# ---------------- Bank catalogue ----------------

@router.get("/banks", response_model=List[BankAdminOut])
async def admin_list_banks(
    q: Optional[str] = Query(None, max_length=50),
    category: Optional[str] = Query(None, pattern="^(commercial|microfinance)$"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Bank).order_by(Bank.name)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(func.lower(Bank.name).like(like) | func.lower(Bank.slug).like(like))
    if category == "commercial":
        query = query.where(Bank.is_commercial.is_(True))
    elif category == "microfinance":
        query = query.where(Bank.is_microfinance.is_(True))
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/banks/refresh", response_model=BankRefreshOut)
async def refresh_banks(
    source: str = Query("auto", pattern="^(auto|static|paystack)$"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Re-seed the bank list from the static catalogue (and/or Paystack)."""
    static_count = await seed_banks(db)
    paystack_count = 0
    live = False
    if source == "paystack":
        paystack_count = await fetch_from_paystack(db)
        live = paystack_count >= 0
        if paystack_count < 0:
            raise HTTPException(status_code=400, detail="PAYSTACK_SECRET_KEY is not configured")
    elif source == "auto":
        paystack_count = await fetch_from_paystack(db)
        live = paystack_count >= 0

    total = (await db.execute(select(func.count(Bank.id)))).scalar_one()
    await log_action(db, "banks_refreshed", current_user.id, "banks", None,
                     new_values={"static": static_count, "paystack": max(paystack_count, 0), "total": total})
    return BankRefreshOut(
        added=static_count,
        updated=max(paystack_count, 0),
        total=total,
        source="paystack" if live else "static",
    )


# ---------------- Withdrawal approvals ----------------

@router.get("/withdrawals", response_model=List[WithdrawalOut])
async def admin_list_withdrawals(
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(WithdrawalRequest).order_by(desc(WithdrawalRequest.requested_at))
    if status:
        try:
            enum_status = WithdrawalStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query = query.where(WithdrawalRequest.status == enum_status)
    else:
        query = query.where(WithdrawalRequest.status != WithdrawalStatus.PENDING)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/withdrawals/pending", response_model=List[WithdrawalOut])
async def admin_pending_withdrawals(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WithdrawalRequest)
        .where(WithdrawalRequest.status == WithdrawalStatus.PENDING)
        .order_by(desc(WithdrawalRequest.requested_at))
    )
    return result.scalars().all()


@router.get("/withdrawals/summary", response_model=dict)
async def admin_withdrawal_summary(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    pending_amount = (await db.execute(
        select(func.coalesce(func.sum(WithdrawalRequest.amount), 0)).where(
            WithdrawalRequest.status == WithdrawalStatus.PENDING
        )
    )).scalar_one()
    this_month = (await db.execute(
        select(func.coalesce(func.sum(WithdrawalRequest.amount), 0)).where(
            WithdrawalRequest.status == WithdrawalStatus.COMPLETED,
            WithdrawalRequest.completed_at.is_not(None),
        )
    )).scalar_one()
    counts = {
        "pending": (await db.execute(
            select(func.count(WithdrawalRequest.id)).where(WithdrawalRequest.status == WithdrawalStatus.PENDING)
        )).scalar_one(),
        "approved": (await db.execute(
            select(func.count(WithdrawalRequest.id)).where(WithdrawalRequest.status == WithdrawalStatus.APPROVED)
        )).scalar_one(),
        "completed": (await db.execute(
            select(func.count(WithdrawalRequest.id)).where(WithdrawalRequest.status == WithdrawalStatus.COMPLETED)
        )).scalar_one(),
        "rejected": (await db.execute(
            select(func.count(WithdrawalRequest.id)).where(WithdrawalRequest.status == WithdrawalStatus.REJECTED)
        )).scalar_one(),
        "failed": (await db.execute(
            select(func.count(WithdrawalRequest.id)).where(WithdrawalRequest.status == WithdrawalStatus.FAILED)
        )).scalar_one(),
    }
    return {
        "pending_amount": round(float(pending_amount), 2),
        "completed_amount": round(float(this_month), 2),
        "counts": counts,
    }


@router.patch("/withdrawals/{withdrawal_id}", response_model=WithdrawalOut)
async def review_withdrawal(
    withdrawal_id: UUID,
    data: WithdrawalAdminUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    withdrawal = (await db.execute(
        select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
    )).scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    if withdrawal.status != WithdrawalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Withdrawal already processed")

    if data.status == "rejected":
        withdrawal.status = WithdrawalStatus.REJECTED
        withdrawal.admin_note = data.admin_note
        withdrawal.processed_at = datetime.now(timezone.utc)
        withdrawal.approved_by = current_user.id
        # Refund the held amount back to the user's wallet
        wallet = (await db.execute(
            select(Wallet).where(Wallet.user_id == withdrawal.user_id)
        )).scalar_one_or_none()
        if wallet:
            wallet.balance = round(wallet.balance + withdrawal.amount, 2)
            db.add(WalletTransaction(
                wallet_id=wallet.id,
                type="withdrawal_reversal",
                amount=withdrawal.amount,
                reference=f"{withdrawal.reference}-REV",
            ))
        await log_action(db, "withdrawal_rejected", current_user.id, "withdrawal_requests", withdrawal.id,
                         new_values={"amount": withdrawal.amount, "note": data.admin_note})
    else:
        withdrawal.status = WithdrawalStatus.PROCESSING
        withdrawal.processed_at = datetime.now(timezone.utc)
        withdrawal.approved_by = current_user.id
        withdrawal.admin_note = data.admin_note
        transfer = await initiate_transfer(
            amount=withdrawal.amount,
            bank_code=withdrawal.bank_code,
            account_number=withdrawal.account_number,
            account_name=withdrawal.account_name,
            reference=withdrawal.reference,
        )
        withdrawal.gateway = transfer.source
        withdrawal.transfer_reference = transfer.reference
        if not transfer.success:
            withdrawal.status = WithdrawalStatus.APPROVED
        await log_action(db, "withdrawal_approved", current_user.id, "withdrawal_requests", withdrawal.id,
                         new_values={"amount": withdrawal.amount, "gateway": transfer.source})
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


@router.post("/withdrawals/{withdrawal_id}/complete", response_model=WithdrawalOut)
async def complete_withdrawal(
    withdrawal_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark an approved/processing withdrawal as completed (transfer confirmed)."""
    withdrawal = (await db.execute(
        select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
    )).scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    if withdrawal.status not in (WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING):
        raise HTTPException(status_code=400, detail="Only approved withdrawals can be completed")

    withdrawal.status = WithdrawalStatus.COMPLETED
    withdrawal.completed_at = datetime.now(timezone.utc)
    await log_action(db, "withdrawal_completed", current_user.id, "withdrawal_requests", withdrawal.id,
                     new_values={"amount": withdrawal.amount})
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


@router.post("/withdrawals/{withdrawal_id}/fail", response_model=WithdrawalOut)
async def fail_withdrawal(
    withdrawal_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark a processing withdrawal as failed and refund the wallet."""
    withdrawal = (await db.execute(
        select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
    )).scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    if withdrawal.status != WithdrawalStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved withdrawals can be marked failed")

    withdrawal.status = WithdrawalStatus.FAILED
    withdrawal.completed_at = None
    withdrawal.processed_at = datetime.now(timezone.utc)
    wallet = (await db.execute(
        select(Wallet).where(Wallet.user_id == withdrawal.user_id)
    )).scalar_one_or_none()
    if wallet:
        wallet.balance = round(wallet.balance + withdrawal.amount, 2)
        db.add(WalletTransaction(
            wallet_id=wallet.id,
            type="withdrawal_reversal",
            amount=withdrawal.amount,
            reference=f"{withdrawal.reference}-REV",
        ))
    await log_action(db, "withdrawal_failed", current_user.id, "withdrawal_requests", withdrawal.id,
                     new_values={"amount": withdrawal.amount})
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal