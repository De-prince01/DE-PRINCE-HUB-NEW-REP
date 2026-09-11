"""Finance endpoints: expenses, commissions, worker payouts."""
from typing import List, Optional
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.user import User
from app.models.cybercafe import Expense
from app.models.order import Order
from app.models.finance import Commission, Wallet, Transaction, WalletTransaction
from app.models.enums import PaymentStatus, PaymentMethod
from app.services.audit import log_action
from app.services.order_number import generate_reference
from app.schemas.cafe import ExpenseCreate, ExpenseOut, CommissionOut

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/report", response_model=dict)
async def finance_report(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate finance report: revenue, expenses, worker payouts, net profit."""
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.status == "paid"
        )
    )).scalar_one()
    expenses = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
    )).scalar_one()
    commissions_paid = (await db.execute(
        select(func.coalesce(func.sum(Commission.worker_amount), 0)).where(
            Commission.is_paid.is_(True)
        )
    )).scalar_one()
    commissions_unpaid = (await db.execute(
        select(func.coalesce(func.sum(Commission.worker_amount), 0)).where(
            Commission.is_paid.is_(False)
        )
    )).scalar_one()
    payouts_total = (await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == "commission_payout"
        )
    )).scalar_one()

    revenue = round(float(revenue), 2)
    expenses = round(float(expenses), 2)
    net = round(revenue - expenses - payouts_total, 2)

    workers_paid = (await db.execute(
        select(func.count(func.distinct(Commission.worker_id))).where(
            Commission.is_paid.is_(True)
        )
    )).scalar_one()

    return {
        "revenue": revenue,
        "expenses": expenses,
        "commissions_paid": round(float(commissions_paid), 2),
        "commissions_unpaid": round(float(commissions_unpaid), 2),
        "worker_payouts": round(float(payouts_total), 2),
        "net_profit": net,
        "workers_paid": workers_paid,
    }


# ---------------- Foreign & operational expenses ----------------

@router.get("/expenses", response_model=List[ExpenseOut])
async def list_expenses(
    category: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Expense).order_by(desc(Expense.created_at))
    if category:
        query = query.where(Expense.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/expenses", response_model=ExpenseOut, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    expense = Expense(
        category=data.category,
        description=data.description,
        amount=data.amount,
        reference=data.reference,
        created_by=current_user.id,
        branch_id=data.branch_id,
    )
    db.add(expense)
    await log_action(db, "expense_created", current_user.id, "expenses", expense.id,
                     new_values={"category": expense.category, "amount": expense.amount})
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense)
    await log_action(db, "expense_deleted", current_user.id, "expenses", expense.id)
    await db.commit()
    return None


# ---------------- Commissions ----------------

@router.get("/commissions", response_model=List[CommissionOut])
async def list_commissions(
    worker_id: Optional[UUID] = None,
    unpaid_only: bool = False,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Commission).order_by(desc(Commission.created_at))
    if worker_id:
        query = query.where(Commission.worker_id == worker_id)
    if unpaid_only:
        query = query.where(Commission.is_paid.is_(False))
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/orders/{order_id}/commission", response_model=CommissionOut, status_code=201)
async def create_commission(
    order_id: UUID,
    payload: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Calculate and record a worker commission for a completed order."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    worker_id = payload.get("worker_id") or order.worker_id
    if not worker_id:
        raise HTTPException(status_code=400, detail="No worker assigned to this order")
    try:
        worker_id = UUID(str(worker_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid worker_id")

    rate = float(payload.get("commission_rate", 20)) / 100.0
    total = order.total
    commission_amount = round(total * rate, 2)
    worker_amount = round(total - commission_amount, 2)

    existing = (await db.execute(
        select(Commission).where(Commission.order_id == order.id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Commission already exists for this order")

    commission = Commission(
        order_id=order.id,
        worker_id=worker_id,
        total_amount=total,
        commission_amount=commission_amount,
        worker_amount=worker_amount,
        commission_rate=rate,
    )
    db.add(commission)
    await log_action(db, "commission_created", current_user.id, "commissions", commission.id,
                     new_values={"order": order.order_number, "worker_amount": worker_amount})
    await db.commit()
    await db.refresh(commission)
    return commission


@router.post("/commissions/{commission_id}/pay", response_model=dict)
async def pay_commission(
    commission_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Settle a worker's commission into their wallet."""
    result = await db.execute(select(Commission).where(Commission.id == commission_id))
    commission = result.scalar_one_or_none()
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    if commission.is_paid:
        raise HTTPException(status_code=400, detail="Commission already paid")

    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == commission.worker_id))).scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=commission.worker_id, balance=0)
        db.add(wallet)
        await db.flush()

    wallet.balance = round(wallet.balance + commission.worker_amount, 2)
    commission.is_paid = True
    commission.paid_at = datetime.now(timezone.utc)

    reference = generate_reference("COM")
    txn = Transaction(
        reference=reference,
        user_id=commission.worker_id,
        order_id=commission.order_id,
        type="commission_payout",
        amount=commission.worker_amount,
        status=PaymentStatus.COMPLETED,
        payment_method=PaymentMethod.WALLET,
        meta={"commission_id": str(commission.id)},
    )
    db.add(txn)
    db.add(WalletTransaction(wallet_id=wallet.id, type="credit", amount=commission.worker_amount, reference=reference))

    # Update the worker's lifetime earnings marker
    worker = (await db.execute(select(User).where(User.id == commission.worker_id))).scalar_one_or_none()
    from app.models.profile import WorkerProfile
    profile = (await db.execute(
        select(WorkerProfile).where(WorkerProfile.user_id == commission.worker_id)
    )).scalar_one_or_none()
    if profile:
        profile.total_earnings = round((profile.total_earnings or 0) + commission.worker_amount, 2)
        profile.total_jobs = (profile.total_jobs or 0) + 1

    await log_action(db, "commission_paid", current_user.id, "commissions", commission.id,
                     new_values={"amount": commission.worker_amount, "reference": reference})
    await db.commit()
    return {"commission_id": str(commission.id), "amount": commission.worker_amount, "balance": wallet.balance,
            "reference": reference}


@router.get("/commissions/mine", response_model=dict)
async def my_commissions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A worker views their own commissions and wallet balance."""
    commissions = (await db.execute(
        select(Commission).where(Commission.worker_id == current_user.id).order_by(desc(Commission.created_at))
    )).scalars().all()
    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))).scalar_one_or_none()
    return {
        "balance": wallet.balance if wallet else 0,
        "commissions": [
            {
                "id": str(c.id),
                "order_id": str(c.order_id),
                "total_amount": c.total_amount,
                "commission_amount": c.commission_amount,
                "worker_amount": c.worker_amount,
                "commission_rate": c.commission_rate,
                "is_paid": c.is_paid,
                "paid_at": c.paid_at,
                "created_at": c.created_at,
            }
            for c in commissions
        ],
    }
