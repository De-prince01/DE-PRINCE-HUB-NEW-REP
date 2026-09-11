"""Notification helper service."""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    title: str,
    message: str,
    type: str = "system",
    data: dict = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        data=data or {},
    )
    db.add(notification)
    await db.flush()
    return notification


async def notify_order_created(db, order) -> None:
    await create_notification(
        db,
        order.customer_id,
        "Order received",
        f"Your order {order.order_number} has been received.",
        type="order_received",
        data={"order_id": str(order.id), "order_number": order.order_number},
    )


async def notify_order_status(db, user_id, order, status_update: str) -> None:
    await create_notification(
        db,
        user_id,
        f"Order {status_update}",
        f"Your order {order.order_number} is now {order.status.value}.",
        type="system",
        data={"order_id": str(order.id), "order_number": order.order_number},
    )


async def _order_customer_id(db: AsyncSession, order_id: UUID):
    from sqlalchemy import select
    from app.models.order import Order

    res = await db.execute(select(Order.customer_id).where(Order.id == order_id))
    row = res.first()
    return row[0] if row else None


async def notify_delivery_created(db, delivery) -> None:
    customer_id = await _order_customer_id(db, delivery.order_id)
    if not customer_id:
        return
    await create_notification(
        db, customer_id, "Dispatch created",
        "A dispatch for your order has been created.",
        type="system",
        data={"delivery_id": str(delivery.id), "order_id": str(delivery.order_id)},
    )


async def notify_delivery_status(db, delivery) -> None:
    customer_id = await _order_customer_id(db, delivery.order_id)
    if not customer_id:
        return
    await create_notification(
        db, customer_id, "Delivery update",
        f"Your dispatch status is now: {delivery.status}.",
        type="system",
        data={"delivery_id": str(delivery.id), "order_id": str(delivery.order_id)},
    )
