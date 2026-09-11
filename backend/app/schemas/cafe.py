"""Cyber café / POS / printing / inventory / finance schemas."""
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import PaymentMethod


class ComputerOut(BaseModel):
    id: UUID
    name: str
    status: str
    hourly_rate: float
    specs: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ComputerSessionStart(BaseModel):
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = "Walk-in"
    estimated_hours: Optional[float] = None


class ComputerSessionOut(BaseModel):
    id: UUID
    computer_id: UUID
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: int
    hourly_rate: float
    total_amount: float
    is_paid: bool

    model_config = ConfigDict(from_attributes=True)


class PrintJobCreate(BaseModel):
    order_id: Optional[UUID] = None
    file_name: str = Field(..., min_length=1)
    total_pages: int = Field(1, ge=1)
    copies: int = Field(1, ge=1)
    color_mode: str = "bw"
    paper_size: str = "A4"
    binding_type: Optional[str] = None
    lamination: bool = False
    notes: Optional[str] = None


class PrintJobOut(BaseModel):
    id: UUID
    order_id: Optional[UUID] = None
    file_id: Optional[UUID] = None
    file_name: str
    total_pages: int
    copies: int
    color_mode: str
    paper_size: str
    binding_type: Optional[str] = None
    lamination: bool
    status: str
    total_amount: float = 0
    is_paid: bool = False
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryItemOut(BaseModel):
    id: UUID
    name: str
    category: Optional[str] = None
    sku: Optional[str] = None
    quantity: int
    unit: str
    purchase_price: float
    selling_price: float
    low_stock_threshold: int
    supplier: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    category: Optional[str] = None
    sku: Optional[str] = None
    quantity: int = Field(0, ge=0)
    unit: str = "piece"
    purchase_price: float = Field(0, ge=0)
    selling_price: float = Field(0, ge=0)
    low_stock_threshold: int = Field(10, ge=0)
    supplier: Optional[str] = None


class StockMovement(BaseModel):
    inventory_id: UUID
    type: str = Field("out", pattern="^(in|out|adjust)$")
    quantity: int = Field(..., ge=1)
    reference: Optional[str] = None
    notes: Optional[str] = None


class POSLine(BaseModel):
    service_id: Optional[UUID] = None
    inventory_id: Optional[UUID] = None
    name: str = Field(..., min_length=1)
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(..., ge=0)


class POSCheckout(BaseModel):
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    lines: List[POSLine] = Field(..., min_items=1)
    payment_method: PaymentMethod = PaymentMethod.CASH
    notes: Optional[str] = None


class ExpenseCreate(BaseModel):
    category: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    reference: Optional[str] = None
    branch_id: Optional[UUID] = None


class ExpenseOut(BaseModel):
    id: UUID
    category: str
    description: str
    amount: float
    reference: Optional[str] = None
    created_by: UUID
    branch_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommissionOut(BaseModel):
    id: UUID
    order_id: UUID
    worker_id: UUID
    total_amount: float
    commission_amount: float
    worker_amount: float
    commission_rate: float
    is_paid: bool
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
