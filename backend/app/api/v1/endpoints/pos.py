"""Point-of-sale endpoints: quick checkout at the counter."""
from typing import List, Optional
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User
from app.models.service import Service
from app.models.cybercafe import InventoryItem, InventoryTransaction
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.finance import Wallet, Transaction, WalletTransaction, Payment
from app.models.enums import OrderStatus, PaymentStatus, PaymentMethod, DeliveryType
from app.services.audit import log_action
from app.services.order_number import generate_order_number, generate_reference
from app.schemas.cafe import POSCheckout

router = APIRouter(prefix="/pos", tags=["pos"])


@router.post("/checkout", response_model=dict, status_code=201)
async def pos_checkout(
    data: POSCheckout,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Register a counter sale (services and/or inventory items) and record payment."""
    subtotal = 0.0
    items = []
    inventory_movements = []

    for line in data.lines:
        quantity = line.quantity
        unit_price = line.unit_price
        name = line.name

        if line.service_id:
            service = (await db.execute(select(Service).where(Service.id == line.service_id))).scalar_one_or_none()
            if not service:
                raise HTTPException(status_code=400, detail=f"Service '{line.name}' not found")
            name = service.name
            unit_price = service.base_price

        if line.inventory_id:
            inv = (await db.execute(select(InventoryItem).where(InventoryItem.id == line.inventory_id))).scalar_one_or_none()
            if not inv:
                raise HTTPException(status_code=400, detail=f"Inventory item '{line.name}' not found")
            name = inv.name
            if inv.selling_price > 0:
                unit_price = inv.selling_price
            if inv.quantity < quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for '{inv.name}'")
            inv.quantity = inv.quantity - quantity
            inventory_movements.append(InventoryTransaction(
                inventory_id=inv.id, type="out", quantity=quantity,
                reference="POS-" + datetime.now().strftime("%Y%m%d%H%M%S"),
                notes="POS sale",
            ))

        line_total = round(unit_price * quantity, 2)
        subtotal += line_total
        items.append(OrderItem(
            service_id=line.service_id,
            service_name=name,
            quantity=quantity,
            unit_price=unit_price,
            total_price=line_total,
        ))

    total = round(subtotal, 2)
    order = Order(
        order_number=generate_order_number(),
        customer_id=data.customer_id or current_user.id,
        status=OrderStatus.PAID,
        subtotal=total,
        tax=0,
        total=total,
        delivery_type=DeliveryType.PICKUP,
        customer_notes=f"POS sale by {current_user.full_name}" + (f" — {data.notes}" if data.notes else ""),
        items=items,
    )
    db.add(order)
    await db.flush()
    db.add(OrderStatusHistory(order_id=order.id, to_status=OrderStatus.PAID, changed_by=current_user.id))
    for movement in inventory_movements:
        db.add(movement)

    # Record the payment
    customer_uuid = data.customer_id or current_user.id
    if data.payment_method == PaymentMethod.WALLET:
        wallet = (await db.execute(select(Wallet).where(Wallet.user_id == customer_uuid))).scalar_one_or_none()
        if not wallet or wallet.balance < total:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        wallet.balance = round(wallet.balance - total, 2)
        reference = generate_reference("POS")
        txn = Transaction(
            reference=reference, user_id=customer_uuid, order_id=order.id,
            type="order_payment", amount=total, status=PaymentStatus.COMPLETED,
            payment_method=PaymentMethod.WALLET, meta={"pos": True},
        )
        db.add(txn)
        await db.flush()
        db.add(WalletTransaction(wallet_id=wallet.id, type="debit", amount=total, reference=reference))
    else:
        reference = generate_reference("POS")
        txn = Transaction(
            reference=reference, user_id=customer_uuid, order_id=order.id,
            type="order_payment", amount=total, status=PaymentStatus.COMPLETED,
            payment_method=data.payment_method, meta={"pos": True},
        )
        db.add(txn)
        await db.flush()

    db.add(Payment(
        transaction_id=txn.id, order_id=order.id, amount=total,
        status=PaymentStatus.COMPLETED, payment_method=data.payment_method,
        completed_at=datetime.now(timezone.utc),
    ))

    await log_action(db, "pos_checkout", current_user.id, "orders", order.id,
                     new_values={"order_number": order.order_number, "total": total, "payment": data.payment_method.value})
    await db.commit()

    return {
        "order_id": str(order.id),
        "order_number": order.order_number,
        "total": total,
        "payment_method": data.payment_method.value,
        "reference": reference,
    }


@router.get("/services", response_model=List[dict])
async def pos_services(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Quick-pick catalogue for the POS register."""
    result = await db.execute(select(Service).where(Service.is_active.is_(True)).order_by(Service.name))
    return [{"id": str(s.id), "name": s.name, "base_price": s.base_price, "kind": "service"} for s in result.scalars().all()]


@router.get("/inventory", response_model=List[dict])
async def pos_inventory(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """In-stock items available to sell at the register."""
    result = await db.execute(
        select(InventoryItem).where(InventoryItem.is_active.is_(True), InventoryItem.quantity > 0)
        .order_by(InventoryItem.name)
    )
    return [{"id": str(i.id), "name": i.name, "unit_price": i.selling_price, "quantity": i.quantity, "kind": "inventory"} for i in result.scalars().all()]
