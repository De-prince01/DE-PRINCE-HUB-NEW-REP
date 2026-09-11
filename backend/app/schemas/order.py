"""Order schemas."""
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class OrderItemCreate(BaseModel):
    service_id: UUID
    quantity: int = Field(1, ge=1)
    custom_options: dict = {}


class OrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_items=1)
    delivery_address: Optional[str] = None
    deadline: Optional[datetime] = None
    customer_notes: Optional[str] = None


class OrderItemOut(BaseModel):
    id: UUID
    service_id: UUID
    service_name: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    id: UUID
    order_number: str
    customer_id: UUID
    worker_id: Optional[UUID] = None
    status: str
    subtotal: float
    delivery_fee: float
    tax: float
    total: float
    customer_notes: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class OrderMessageCreate(BaseModel):
    message: str = Field(..., min_length=1)


class OrderMessageOut(BaseModel):
    id: UUID
    order_id: UUID
    sender_id: UUID
    message: str
    file_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

