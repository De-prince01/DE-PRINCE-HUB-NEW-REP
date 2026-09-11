"""Order endpoints: create, list, detail, status, messaging, files."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user, require_customer, require_admin
from app.models.user import User
from app.models.service import Service
from app.models.order import (
    Order, OrderItem, OrderStatusHistory, OrderMessage
)
from app.models.file import File as FileModel
from app.models.enums import OrderStatus
from app.schemas.order import (
    OrderCreate, OrderOut, OrderStatusUpdate, OrderMessageCreate, OrderMessageOut
)
from app.services.order_number import generate_order_number
from app.services.notifications import notify_order_created, notify_order_status
from app.services.referral import maybe_reward_referral
from app.services.file_storage import save_upload
from app.services.audit import log_action

router = APIRouter(prefix="/orders", tags=["orders"])


def order_query():
    return (
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
    )


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "customer" and not current_user.is_verified:
        pass  # allow ordering; verification enforced at payment/pickup if configured

    subtotal = 0.0
    items = []
    for item in data.items:
        result = await db.execute(select(Service).where(Service.id == item.service_id))
        service = result.scalar_one_or_none()
        if not service or not service.is_active:
            raise HTTPException(status_code=400, detail=f"Service {item.service_id} not found")
        line_total = service.base_price * item.quantity
        subtotal += line_total
        items.append(
            OrderItem(
                service_id=service.id,
                service_name=service.name,
                quantity=item.quantity,
                unit_price=service.base_price,
                total_price=line_total,
                custom_options=item.custom_options,
            )
        )

    total = subtotal
    order = Order(
        order_number=generate_order_number(),
        customer_id=current_user.id,
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        tax=0,
        total=total,
        delivery_address=data.delivery_address,
        deadline=data.deadline,
        customer_notes=data.customer_notes,
        items=items,
    )
    db.add(order)
    await db.flush()

    db.add(OrderStatusHistory(order_id=order.id, to_status=OrderStatus.PENDING, changed_by=current_user.id))
    await notify_order_created(db, order)
    await log_action(db, "order_created", current_user.id, "orders", order.id, new_values={"order_number": order.order_number, "total": total})
    await db.commit()

    result = await db.execute(order_query().where(Order.id == order.id))
    return result.scalar_one()


@router.get("", response_model=List[OrderOut])
async def list_orders(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = order_query()
    if current_user.role == "customer":
        query = query.where(Order.customer_id == current_user.id)
    if status_filter:
        query = query.where(Order.status == status_filter)
    query = query.order_by(desc(Order.created_at))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(order_query().where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if (
        current_user.role == "customer"
        and order.customer_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not your order")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    current_user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    # Only admin/staff roles can update status; customers request revisions
    if current_user.role == "customer":
        if data.status != "revision_requested":
            raise HTTPException(status_code=403, detail="Customers can only request revisions")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old = order.status
    try:
        new_status = OrderStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    order.status = new_status
    db.add(OrderStatusHistory(
        order_id=order.id, from_status=old, to_status=new_status,
        changed_by=current_user.id, notes=data.notes,
    ))
    await notify_order_status(db, order.customer_id, order, data.status)
    await log_action(db, "order_status_update", current_user.id, "orders", order.id,
                     old_values={"status": old.value}, new_values={"status": new_status.value})
    await db.commit()
    if new_status in (OrderStatus.PAID, OrderStatus.COMPLETED):
        reward_issued = await maybe_reward_referral(db, order)
        if reward_issued:
            await db.commit()
    order = (await db.execute(order_query().where(Order.id == order.id))).scalars().first()
    return order


@router.post("/{order_id}/messages", response_model=OrderMessageOut, status_code=201)
async def send_message(
    order_id: UUID,
    data: OrderMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    message = OrderMessage(order_id=order.id, sender_id=current_user.id, message=data.message)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.get("/{order_id}/messages", response_model=List[OrderMessageOut])
async def list_messages(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    result = await db.execute(
        select(OrderMessage).where(OrderMessage.order_id == order_id).order_by(OrderMessage.created_at)
    )
    return result.scalars().all()


@router.post("/{order_id}/files", status_code=201)
async def upload_order_file(
    order_id: UUID,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    saved = []
    for upload in files:
        meta = await save_upload(upload, order_id=order_id)
        file_model = FileModel(
            order_id=order.id,
            uploaded_by=current_user.id,
            original_name=meta["original_name"],
            stored_name=meta["stored_name"],
            mime_type=meta["mime_type"],
            file_size=meta["file_size"],
            file_path=meta["stored_relative"],
        )
        db.add(file_model)
        saved.append(meta)
    await log_action(db, "files_uploaded", current_user.id, "orders", order.id, new_values={"count": len(saved)})
    await db.commit()
    return {"uploaded": len(saved), "files": saved}
