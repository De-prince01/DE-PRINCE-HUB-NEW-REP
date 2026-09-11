"""Payment and wallet endpoints with provider abstraction."""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_customer
from app.models.user import User
from app.models.finance import Transaction, Wallet, WalletTransaction, Payment
from app.models.order import Order
from app.models.enums import PaymentStatus, PaymentMethod
from app.services.payments import gateway
from app.services.order_number import generate_reference
from app.services.audit import log_action
from app.schemas.payment import PaymentCreate, PaymentOut, WalletOut

router = APIRouter(tags=["payments"])


@router.post("/payments", response_model=dict, status_code=201)
async def create_payment(
    data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a payment intent for an order (or wallet top-up)."""
    amount = data.amount
    order_ref = data.order_id
    if data.order_id:
        result = await db.execute(select(Order).where(Order.id == data.order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your order")
        amount = order.total

    reference = generate_reference("PAY")
    txn = Transaction(
        reference=reference,
        user_id=current_user.id,
        order_id=data.order_id,
        type="order_payment",
        amount=amount,
        status=PaymentStatus.PENDING,
        payment_method=data.payment_method,
    )
    db.add(txn)
    await db.flush()

    payment = Payment(
        transaction_id=txn.id,
        order_id=data.order_id,
        amount=amount,
        status=PaymentStatus.PENDING,
        payment_method=data.payment_method,
    )
    db.add(payment)

    intent = await gateway.create_payment(
        reference=reference,
        amount=amount,
        email=current_user.email,
        metadata={"order_id": str(data.order_id) if data.order_id else None},
    )
    txn.gateway = intent.provider
    txn.gateway_reference = intent.reference
    payment.gateway = intent.provider

    await log_action(db, "payment_created", current_user.id, "transactions", txn.id,
                     new_values={"reference": reference, "amount": amount})
    await db.commit()

    return {
        "reference": reference,
        "amount": amount,
        "authorization_url": intent.authorization_url,
        "provider": intent.provider,
    }


@router.post("/payments/verify/{reference}")
async def verify_payment(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Transaction).where(Transaction.reference == reference))
    txn = result.scalar_one_or_none()
    if not txn or txn.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    verify_result = await gateway.verify_payment(reference)
    ok = verify_result.get("status") in ("success", "successful")

    if ok and txn.status != PaymentStatus.COMPLETED:
        txn.status = PaymentStatus.COMPLETED
        payment = (await db.execute(select(Payment).where(Payment.transaction_id == txn.id))).scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.COMPLETED
        if txn.type == "order_payment" and txn.order_id:
            order = (await db.execute(select(Order).where(Order.id == txn.order_id))).scalar_one_or_none()
            if order:
                order.status = "paid"
        await log_action(db, "payment_verified", current_user.id, "transactions", txn.id,
                         new_values={"status": "completed"})
        await db.commit()

    return {"reference": reference, "status": "completed" if ok else "pending"}


@router.get("/wallet", response_model=WalletOut)
async def get_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=current_user.id)
        db.add(wallet)
        await db.commit()
        await db.refresh(wallet)
    return wallet


@router.get("/transactions")
async def list_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id).order_by(Transaction.created_at.desc())
    )
    return result.scalars().all()


@router.get("/wallet/transactions")
async def list_wallet_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_transactions(current_user, db)


@router.post("/wallet/fund", response_model=dict, status_code=201)
async def fund_wallet(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Top up the user's wallet via the configured (mock) payment gateway."""
    amount = float(payload.get("amount", 0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = wallet_result.scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=current_user.id, balance=0)
        db.add(wallet)
        await db.flush()

    reference = generate_reference("WAL")
    txn = Transaction(
        reference=reference,
        user_id=current_user.id,
        type="wallet_topup",
        amount=amount,
        status=PaymentStatus.PENDING,
        payment_method=PaymentMethod.ONLINE,
    )
    db.add(txn)
    await db.flush()

    intent = await gateway.create_payment(
        reference=reference,
        amount=amount,
        email=current_user.email,
        metadata={"type": "wallet_topup"},
    )
    txn.gateway = intent.provider

    # DevelopmentMock always succeeds; real providers require webhook/redirect verification.
    if intent.provider == "mock":
        txn.status = PaymentStatus.COMPLETED
        txn.completed_at = datetime.now(timezone.utc)
        wallet.balance = round(wallet.balance + amount, 2)
        db.add(WalletTransaction(
            wallet_id=wallet.id,
            type="credit",
            amount=amount,
            reference=reference,
            created_at=datetime.now(timezone.utc),
        ))
        await log_action(db, "wallet_funded", current_user.id, "wallets", wallet.id,
                         new_values={"amount": amount, "reference": reference})
        await db.commit()
        return {
            "reference": reference,
            "amount": amount,
            "balance": wallet.balance,
            "provider": intent.provider,
            "status": "completed",
            "authorization_url": intent.authorization_url,
        }

    await db.commit()
    return {
        "reference": reference,
        "amount": amount,
        "status": "pending",
        "provider": intent.provider,
        "authorization_url": intent.authorization_url,
    }
