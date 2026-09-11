"""Inventory endpoints: items, stock movements, low-stock alerts."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User
from app.models.cybercafe import InventoryItem, InventoryTransaction
from app.services.audit import log_action
from app.schemas.cafe import InventoryItemCreate, InventoryItemOut, StockMovement

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=List[InventoryItemOut])
async def list_inventory(
    low_stock: bool = False,
    category: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(InventoryItem).where(InventoryItem.is_active.is_(True)).order_by(InventoryItem.name)
    if low_stock:
        query = query.where(InventoryItem.quantity <= InventoryItem.low_stock_threshold)
    if category:
        query = query.where(InventoryItem.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/low-stock", response_model=List[InventoryItemOut])
async def low_stock(current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.is_active.is_(True),
            InventoryItem.quantity <= InventoryItem.low_stock_threshold,
        ).order_by(InventoryItem.quantity)
    )
    return result.scalars().all()


@router.post("", response_model=InventoryItemOut, status_code=201)
async def create_item(
    data: InventoryItemCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if data.sku:
        existing = (await db.execute(select(InventoryItem).where(InventoryItem.sku == data.sku))).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")
    item = InventoryItem(**data.model_dump())
    db.add(item)
    await log_action(db, "inventory_created", current_user.id, "inventory", item.id,
                     new_values={"name": item.name, "quantity": item.quantity})
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/stock/in", response_model=InventoryItemOut)
async def stock_in(
    payload: StockMovement,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add stock to an item (inbound)."""
    item = (await db.execute(select(InventoryItem).where(InventoryItem.id == payload.inventory_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if payload.type == "adjust":
        item.quantity = max(0, payload.quantity)
    else:
        item.quantity = max(0, item.quantity + payload.quantity)
    db.add(InventoryTransaction(
        inventory_id=item.id, type=payload.type, quantity=payload.quantity,
        reference=payload.reference, notes=payload.notes,
    ))
    await log_action(db, "stock_in", current_user.id, "inventory", item.id,
                     new_values={"quantity": item.quantity, "delta": payload.quantity})
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/stock/out", response_model=InventoryItemOut)
async def stock_out(
    payload: StockMovement,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove stock from an item (outbound)."""
    item = (await db.execute(select(InventoryItem).where(InventoryItem.id == payload.inventory_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    item.quantity = item.quantity - payload.quantity
    db.add(InventoryTransaction(
        inventory_id=item.id, type="out", quantity=payload.quantity,
        reference=payload.reference, notes=payload.notes,
    ))
    await log_action(db, "stock_out", current_user.id, "inventory", item.id,
                     new_values={"quantity": item.quantity, "delta": -payload.quantity})
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/{item_id}/transactions")
async def item_transactions(
    item_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InventoryTransaction).where(InventoryTransaction.inventory_id == item_id)
    )
    return result.scalars().all()
