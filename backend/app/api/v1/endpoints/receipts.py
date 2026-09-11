"""Receipt endpoints: structured receipt data + a scannable QR payload string."""
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.order import Order
from app.models.finance import Payment, Transaction
from app.models.enums import PaymentStatus, PaymentMethod
from app.models.notification import Receipt
from app.services.order_number import generate_reference

router = APIRouter(prefix="/receipts", tags=["receipts"])

BUSINESS_NAME = "DE-PRINCE DIGITAL HUB"


def _qr_payload(*parts: str) -> str:
    return "DPR:" + ":".join(str(p) for p in parts)


@router.get("/orders/{order_id}", response_model=dict)
async def order_receipt(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a printable receipt for an order (owner or admin/staff)."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    customer = (await db.execute(select(User).where(User.id == order.customer_id))).scalar_one_or_none()

    payment_status = "pending"
    method = "unknown"
    reference = None
    result = await db.execute(select(Payment).where(Payment.order_id == order.id))
    payment = result.scalars().first()
    if payment:
        payment_status = payment.status.value if hasattr(payment.status, "value") else str(payment.status)
        method = payment.payment_method.value if hasattr(payment.payment_method, "value") else str(payment.payment_method)
    result = await db.execute(select(Transaction).where(Transaction.order_id == order.id))
    txn = result.scalars().first()
    if txn:
        reference = txn.reference

    issued = datetime.now()

    existing = (await db.execute(select(Receipt).where(Receipt.order_id == order.id))).scalar_one_or_none()
    if not existing:
        receipt_no = generate_reference("RCP")
        existing = Receipt(
            receipt_number=receipt_no,
            order_id=order.id,
            transaction_id=txn.id if txn else None,
            customer_id=order.customer_id,
            subtotal=order.subtotal,
            tax=order.tax,
            total=order.total,
            payment_method=payment.payment_method if payment else None,
            qr_data=_qr_payload("ORDER", order.order_number, str(round(order.total, 2))),
        )
        db.add(existing)
        await db.commit()
        await db.refresh(existing)

    return {
        "business": BUSINESS_NAME,
        "type": "order",
        "receipt_number": existing.receipt_number,
        "qr_payload": existing.qr_data,
        "order": {
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status.value if hasattr(order.status, "value") else str(order.status),
            "created_at": order.created_at,
            "completed_at": order.completed_at,
            "payment_status": payment_status,
            "payment_method": method,
            "reference": reference,
        },
        "customer": {
            "name": f"{customer.first_name or ''} {customer.last_name or ''}".strip() if customer else "",
            "email": customer.email if customer else None,
        },
        "items": [
            {
                "service_name": it.service_name,
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "total_price": it.total_price,
            }
            for it in order.items
        ],
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "tax": order.tax,
        "discount": order.discount,
        "total": order.total,
        "issued_at": issued,
    }


@router.get("/transactions/{reference}", response_model=dict)
async def transaction_receipt(
    reference: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a printable receipt for a wallet/transaction by its reference."""
    result = await db.execute(select(Transaction).where(Transaction.reference == reference))
    txn = result.scalar_one_or_none()
    if not txn or txn.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    user = (await db.execute(select(User).where(User.id == txn.user_id))).scalar_one_or_none()

    return {
        "business": BUSINESS_NAME,
        "type": "transaction",
        "receipt_no": txn.reference,
        "qr_payload": _qr_payload("TXN", txn.reference, str(round(txn.amount, 2))),
        "transaction": {
            "reference": txn.reference,
            "type": txn.type,
            "amount": txn.amount,
            "status": txn.status.value if hasattr(txn.status, "value") else str(txn.status),
            "method": txn.payment_method.value if txn.payment_method and hasattr(txn.payment_method, "value") else str(txn.payment_method or ""),
            "created_at": txn.created_at,
            "completed_at": txn.completed_at,
        },
        "customer": {
            "name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "",
            "email": user.email if user else None,
        },
        "issued_at": datetime.now(),
    }


@router.get("/verify/{receipt_number}", response_model=dict)
async def verify_receipt(receipt_number: str, db: AsyncSession = Depends(get_db)):
    """Public lookup to verify a receipt number is genuine (used by QR scans)."""
    result = await db.execute(select(Receipt).where(Receipt.receipt_number == receipt_number))
    receipt = result.scalar_one_or_none()
    if not receipt:
        return {
            "valid": False,
            "receipt_number": receipt_number,
            "message": "Receipt not found",
        }
    order_no = None
    if receipt.order_id:
        o = (await db.execute(select(Order).where(Order.id == receipt.order_id))).scalar_one_or_none()
        order_no = o.order_number if o else None
    return {
        "valid": True,
        "business": BUSINESS_NAME,
        "receipt_number": receipt.receipt_number,
        "order_number": order_no,
        "total": receipt.total,
        "issued_at": receipt.issued_at,
    }
