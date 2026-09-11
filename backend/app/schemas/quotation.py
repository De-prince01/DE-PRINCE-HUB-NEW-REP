"""Quotation schemas."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class QuotationRequestCreate(BaseModel):
    service_id: UUID
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    files: Optional[List[dict]] = None
    deadline: Optional[datetime] = None
    budget: Optional[float] = Field(None, ge=0)


class QuotationItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(..., ge=0)


class QuotationCreate(BaseModel):
    request_id: UUID
    note: Optional[str] = None
    discount: float = 0
    delivery_fee: float = 0
    tax: float = 0
    valid_until: Optional[datetime] = None
    items: List[QuotationItemCreate] = Field(..., min_items=1)


class QuotationResponseAction(BaseModel):
    message: Optional[str] = None
    requested_quotation_id: Optional[UUID] = None


class QuotationItemOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float

    model_config = ConfigDict(from_attributes=True)


class QuotationOut(BaseModel):
    id: UUID
    quotation_number: str
    request_id: UUID
    note: Optional[str] = None
    discount: float = 0
    delivery_fee: float = 0
    tax: float = 0
    valid_until: Optional[datetime] = None
    status: str
    subtotal: float = 0
    total: float = 0
    created_at: datetime
    service_name: Optional[str] = None
    order_number: Optional[str] = None
    items: List[QuotationItemOut] = []

    model_config = ConfigDict(from_attributes=True)


class QuotationRequestOut(BaseModel):
    id: UUID
    request_number: str
    customer_id: UUID
    service_id: UUID
    service_name: Optional[str] = None
    customer_name: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[list] = None
    files: Optional[list] = None
    deadline: Optional[datetime] = None
    budget: Optional[float] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)