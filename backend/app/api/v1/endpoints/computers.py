"""Cyber cafÃ© management endpoints: computers, sessions, customer rental flow."""
from typing import List
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.user import User
from app.models.cybercafe import Computer, ComputerSession
from app.models.finance import Wallet, Transaction, WalletTransaction
from app.models.enums import ComputerStatus, PaymentStatus, PaymentMethod
from app.services.audit import log_action
from app.services.order_number import generate_reference
from app.schemas.cafe import ComputerOut, ComputerSessionStart, ComputerSessionOut

router = APIRouter(prefix="/computers", tags=["computers"])


def _computer_out(c):
    return {
        "id": str(c.id),
        "name": c.name,
        "status": c.status.value,
        "hourly_rate": c.hourly_rate,
        "specs": c.specs,
    }


@router.get("/available", response_model=List[dict])
async def list_available_computers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Public computer marketplace: computers a customer can book."""
    result = await db.execute(
        select(Computer).where(Computer.status == ComputerStatus.AVAILABLE, Computer.is_active.is_(True))
        .order_by(Computer.name)
    )
    return [_computer_out(c) for c in result.scalars().all()]


@router.get("", response_model=List[dict])
async def list_computers(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Computer).order_by(Computer.name))
    return [_computer_out(c) for c in result.scalars().all()]


@router.post("", status_code=201)
async def create_computer(
    payload: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    computer = Computer(
        name=payload["name"],
        hourly_rate=payload.get("hourly_rate", 300),
        specs=payload.get("specs"),
    )
    db.add(computer)
    await log_action(db, "computer_created", current_user.id, "computers", computer.id,
                     new_values={"name": computer.name})
    await db.commit()
    await db.refresh(computer)
    return _computer_out(computer)


@router.post("/{computer_id}/book", response_model=ComputerSessionOut, status_code=201)
async def book_computer(
    computer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Customer books an available computer (self-serve rent)."""
    result = await db.execute(select(Computer).where(Computer.id == computer_id))
    computer = result.scalar_one_or_none()
    if not computer:
        raise HTTPException(status_code=404, detail="Computer not found")
    if computer.status != ComputerStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Computer is not available")

    # A customer can only have one active session for themselves
    active = (await db.execute(
        select(ComputerSession).where(
            ComputerSession.customer_id == current_user.id,
            ComputerSession.ended_at.is_(None),
        )
    )).scalar_one_or_none()
    if active:
        raise HTTPException(status_code=400, detail="You already have an active session")

    session = ComputerSession(
        computer_id=computer.id,
        customer_id=current_user.id,
        customer_name=current_user.full_name or "Customer",
        hourly_rate=computer.hourly_rate,
    )
    computer.status = ComputerStatus.IN_USE
    db.add(session)
    await log_action(db, "session_started", current_user.id, "computer_sessions", session.id,
                     new_values={"computer": computer.name})
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/mine", response_model=List[ComputerSessionOut])
async def my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ComputerSession).where(ComputerSession.customer_id == current_user.id)
        .order_by(ComputerSession.started_at.desc())
    )
    return result.scalars().all()


@router.post("/{computer_id}/session/start", response_model=ComputerSessionOut, status_code=201)
async def start_session(
    computer_id: UUID,
    payload: ComputerSessionStart,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Computer).where(Computer.id == computer_id))
    computer = result.scalar_one_or_none()
    if not computer:
        raise HTTPException(status_code=404, detail="Computer not found")
    if computer.status != ComputerStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Computer not available")

    session = ComputerSession(
        computer_id=computer.id,
        customer_id=payload.customer_id,
        customer_name=payload.customer_name or "Walk-in",
        hourly_rate=computer.hourly_rate,
    )
    computer.status = ComputerStatus.IN_USE
    db.add(session)
    await log_action(db, "session_started", current_user.id, "computer_sessions", session.id,
                     new_values={"computer": computer.name})
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/session/{session_id}/stop", response_model=ComputerSessionOut)
async def stop_session_by_id(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stop an active session. Customers can stop their own; admins any."""
    result = await db.execute(select(ComputerSession).where(ComputerSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session or session.ended_at is not None:
        raise HTTPException(status_code=404, detail="Active session not found")
    if current_user.role == "customer" and session.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    ended = datetime.utcnow()
    duration_min = max(1, int((ended - session.started_at).total_seconds() / 60))
    session.ended_at = ended
    session.duration_minutes = duration_min
    session.total_amount = round((duration_min / 60) * session.hourly_rate, 2)

    computer = (await db.execute(select(Computer).where(Computer.id == session.computer_id))).scalar_one_or_none()
    if computer:
        computer.status = ComputerStatus.AVAILABLE

    await log_action(db, "session_stopped", current_user.id, "computer_sessions", session.id,
                     new_values={"duration_minutes": duration_min, "amount": session.total_amount})
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/{computer_id}/session/stop", response_model=ComputerSessionOut)
async def stop_session(
    computer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Computer).where(Computer.id == computer_id))
    computer = result.scalar_one_or_none()
    if not computer:
        raise HTTPException(status_code=404, detail="Computer not found")

    session = (await db.execute(
        select(ComputerSession).where(ComputerSession.computer_id == computer.id, ComputerSession.ended_at.is_(None))
    )).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=400, detail="No active session")
    if current_user.role == "customer" and session.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    ended = datetime.utcnow()
    duration_min = max(1, int((ended - session.started_at).total_seconds() / 60))
    session.ended_at = ended
    session.duration_minutes = duration_min
    session.total_amount = round((duration_min / 60) * session.hourly_rate, 2)
    computer.status = ComputerStatus.AVAILABLE

    await log_action(db, "session_stopped", current_user.id, "computer_sessions", session.id,
                     new_values={"duration_minutes": duration_min, "amount": session.total_amount})
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/session/{session_id}/pay", response_model=dict)
async def pay_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pay for a stopped session from the customer's wallet."""
    result = await db.execute(select(ComputerSession).where(ComputerSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session or session.ended_at is None:
        raise HTTPException(status_code=404, detail="Stopped session not found")
    if current_user.role == "customer" and session.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.is_paid:
        raise HTTPException(status_code=400, detail="Session already paid")

    amount = session.total_amount
    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))).scalar_one_or_none()
    if not wallet or wallet.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    wallet.balance = round(wallet.balance - amount, 2)
    session.is_paid = True

    reference = generate_reference("SES")
    txn = Transaction(
        reference=reference,
        user_id=current_user.id,
        type="computer_session",
        amount=amount,
        status=PaymentStatus.COMPLETED,
        payment_method=PaymentMethod.WALLET,
        meta={"session_id": str(session.id)},
    )
    db.add(txn)
    db.add(WalletTransaction(wallet_id=wallet.id, type="debit", amount=amount, reference=reference))

    await log_action(db, "session_paid", current_user.id, "computer_sessions", session.id,
                     new_values={"amount": amount, "reference": reference})
    await db.commit()
    return {"session_id": str(session.id), "amount": amount, "balance": wallet.balance, "reference": reference}

