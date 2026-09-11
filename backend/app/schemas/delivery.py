"""Delivery schemas."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class DeliveryZoneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    fee: float = Field(0, ge=0)
    estimated_time: Optional[str] = None
    is_active: bool = True


class DeliveryZoneUpdate(BaseModel):
    name: Optional[str] = None
    fee: Optional[float] = Field(None, ge=0)
    estimated_time: Optional[str] = None
    is_active: Optional[bool] = None


class DeliveryZoneOut(BaseModel):
    id: UUID
    name: str
    fee: float
    estimated_time: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DeliveryCreate(BaseModel):
    order_id: UUID
    zone_id: Optional[UUID] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class DeliveryAssign(BaseModel):
    delivery_person_id: UUID


class DeliveryStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class DeliveryOut(BaseModel):
    id: UUID
    order_id: UUID
    order_number: Optional[str] = None
    delivery_type: str
    zone_id: Optional[UUID] = None
    zone_name: Optional[str] = None
    delivery_person_id: Optional[UUID] = None
    delivery_person_name: Optional[str] = None
    address: Optional[str] = None
    fee: float = 0
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)