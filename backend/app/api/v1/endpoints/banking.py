"""Bank catalogue, wallet bank account, and withdrawal endpoints."""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.bank import Bank, WithdrawalRequest
from app.models.finance import Wallet, Transaction, WalletTransaction
from app.models.enums import WithdrawalStatus, PaymentStatus, PaymentMethod
from app.services.banks import seed_banks, fetch_from_paystack
from app.services.payout import name_enquiry, initiate_transfer
from app.services.order_number import generate_reference
from app.services.audit import log_action
from app.schemas.bank import (
    BankOut, BankLookupOut, BankAccountIn, BankAccountOut,
    WithdrawalCreate, WithdrawalOut,
)

router = APIRouter(tags=["banking"])

MIN_WITHDRAWAL = 500.0


# ---------------- Public bank catalogue ----------------

@router.get("/banks", response_model=List[BankOut])
async def list_banks(
    q: Optional[str] = Query(None, max_length=50),
    db: AsyncSession = Depends(get_db),
):
    """List the supported bank catalogue (commercial + microfinance)."""
    query = select(Bank).where(Bank.is_active.is_(True)).order_by(Bank.name)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(func.lower(Bank.name).like(like) | func.lower(Bank.slug).like(like))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/banks/{code}", response_model=BankOut)
async def get_bank(code: str, db: AsyncSession = Depends(get_db)):
    bank = (await db.execute(select(Bank).where(Bank.code == code))).scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    return bank


# ---------------- Wallet bank account ----------------

@router.get("/wallet/bank", response_model=BankAccountOut)
async def get_wallet_bank(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))).scalar_one_or_none()
    if not wallet:
        return BankAccountOut()
    bank_name = None
    if wallet.bank_code:
        bank = (await db.execute(select(Bank).where(Bank.code == wallet.bank_code))).scalar_one_or_none()
        bank_name = bank.name if bank else None
    return BankAccountOut(
        bank_code=wallet.bank_code,
        bank_name=bank_name,
        account_number=wallet.account_number,
        account_name=wallet.account_name,
        account_verified=wallet.account_verified,
    )


@router.post("/wallet/bank", response_model=BankAccountOut, status_code=201)
async def save_wallet_bank(
    data: BankAccountIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save the user's withdrawal bank account, with Paystack name-enquiry."""
    bank = (await db.execute(select(Bank).where(Bank.code == data.bank_code))).scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Unknown bank code")

    enquiry = await name_enquiry(data.bank_code, data.account_number)
    if not enquiry.valid:
        raise HTTPException(status_code=400, detail="Invalid account number")

    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))).scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=current_user.id, balance=0)
        db.add(wallet)

    wallet.bank_code = data.bank_code
    wallet.account_number = data.account_number
    wallet.account_name = enquiry.account_name
    wallet.account_verified = enquiry.valid

    await log_action(db, "wallet_bank_saved", current_user.id, "wallets", wallet.id,
                     new_values={"bank_code": data.bank_code, "account_number": data.account_number})
    await db.commit()
    await db.refresh(wallet)
    return BankAccountOut(
        bank_code=wallet.bank_code,
        bank_name=bank.name,
        account_number=wallet.account_number,
        account_name=wallet.account_name,
        account_verified=wallet.account_verified,
    )


@router.post("/wallet/bank/verify", response_model=BankLookupOut)
async def verify_bank_account(
    data: BankAccountIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm an account name before saving it (does not persist)."""
    bank = (await db.execute(select(Bank).where(Bank.code == data.bank_code))).scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Unknown bank code")
    enquiry = await name_enquiry(data.bank_code, data.account_number)
    return BankLookupOut(
        account_number=data.account_number,
        account_name=enquiry.account_name,
        bank_code=data.bank_code,
        bank_name=bank.name,
        valid=enquiry.valid,
        source=enquiry.source,
    )


# ---------------- Withdrawals ----------------

@router.post("/wallet/withdraw", response_model=WithdrawalOut, status_code=201)
async def request_withdrawal(
    data: WithdrawalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Request a wallet payout to the user's saved bank account."""
    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))).scalar_one_or_none()
    if not wallet or not wallet.account_number or not wallet.bank_code:
        raise HTTPException(status_code=400, detail="Save a bank account before withdrawing")

    if data.amount < MIN_WITHDRAWAL:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is ₦{MIN_WITHDRAWAL:,.0f}")

    pending = (await db.execute(
        select(func.count(WithdrawalRequest.id)).where(
            WithdrawalRequest.user_id == current_user.id,
            WithdrawalRequest.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING]),
        )
    )).scalar_one()
    if pending:
        raise HTTPException(status_code=400, detail="You already have a pending withdrawal request")

    if wallet.balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    withdrawal = WithdrawalRequest(
        reference=generate_reference("WTH"),
        user_id=current_user.id,
        amount=round(data.amount, 2),
        bank_code=wallet.bank_code,
        account_number=wallet.account_number,
        account_name=wallet.account_name,
        status=WithdrawalStatus.PENDING,
    )
    db.add(withdrawal)

    wallet.balance = round(wallet.balance - data.amount, 2)
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        type="withdrawal_hold",
        amount=-data.amount,
        reference=withdrawal.reference,
    ))

    await log_action(db, "withdrawal_requested", current_user.id, "withdrawal_requests", withdrawal.id,
                     new_values={"amount": data.amount, "reference": withdrawal.reference})
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal


@router.get("/wallet/withdrawals", response_model=List[WithdrawalOut])
async def my_withdrawals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WithdrawalRequest)
        .where(WithdrawalRequest.user_id == current_user.id)
        .order_by(desc(WithdrawalRequest.requested_at))
    )
    return result.scalars().all()