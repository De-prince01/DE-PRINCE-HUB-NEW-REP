"""Payment and wallet schemas."""
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import PaymentMethod


class PaymentCreate(BaseModel):
    order_id: Optional[UUID] = None
    amount: Optional[float] = Field(None, gt=0)
    payment_method: PaymentMethod = PaymentMethod.ONLINE


class PaymentOut(BaseModel):
    id: UUID
    transaction_id: UUID
    order_id: Optional[UUID] = None
    amount: float
    status: str
    payment_method: str


class WalletOut(BaseModel):
    id: UUID
    user_id: UUID
    balance: float

    model_config = ConfigDict(from_attributes=True)

