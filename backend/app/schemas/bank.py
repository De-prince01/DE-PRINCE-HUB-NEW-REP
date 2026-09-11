"""Bank and withdrawal schemas."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class BankOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    slug: Optional[str] = None
    longcode: Optional[str] = None
    is_commercial: bool = False
    is_microfinance: bool = False
    currency: Optional[str] = "NGN"


class BankLookupOut(BaseModel):
    account_number: str
    account_name: str
    bank_code: str
    bank_name: Optional[str] = None
    valid: bool = True
    source: str = "mock"


class BankAccountIn(BaseModel):
    bank_code: str = Field(..., min_length=1, max_length=10)
    account_number: str = Field(..., min_length=10, max_length=10)


class BankAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    account_verified: bool = False


class WithdrawalCreate(BaseModel):
    amount: float = Field(..., gt=0)


class WithdrawalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reference: str
    amount: float
    bank_code: str
    account_number: str
    account_name: Optional[str] = None
    status: str
    gateway: Optional[str] = None
    transfer_reference: Optional[str] = None
    admin_note: Optional[str] = None
    requested_at: datetime
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class WithdrawalAdminUpdate(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    admin_note: Optional[str] = None


class WithdrawalRejectIn(BaseModel):
    admin_note: Optional[str] = Field(None, max_length=500)


class BankRefreshOut(BaseModel):
    added: int
    updated: int
    total: int
    source: str


class BankAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    slug: Optional[str] = None
    longcode: Optional[str] = None
    paystack_id: Optional[int] = None
    is_commercial: bool = False
    is_microfinance: bool = False
    is_active: bool = True
    currency: Optional[str] = "NGN"