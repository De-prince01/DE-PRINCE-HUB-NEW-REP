"""Subscription schemas: plans, subscriptions, renewals."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SubscriptionPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    billing_cycle: str = "monthly"
    amount: float = 0
    service_id: Optional[UUID] = None
    is_active: bool = True


class SubscriptionPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    billing_cycle: str
    amount: float
    is_active: bool


class SubscriptionCreate(BaseModel):
    plan_id: UUID
    auto_renew: bool = True


class SubscriptionRenewalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    subscription_id: UUID
    cycle_start: datetime
    cycle_end: datetime
    amount: float
    status: str
    payment_method: Optional[str] = None
    transaction_ref: Optional[str] = None
    created_at: datetime


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    subscription_number: str
    customer_id: UUID
    plan_id: UUID
    amount: float
    billing_cycle: str
    status: str
    service_status: str
    start_date: datetime
    next_billing_date: datetime
    last_billed_at: Optional[datetime] = None
    auto_renew: bool
    renewal_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Decoration
    plan_name: Optional[str] = None
    customer_name: Optional[str] = None
    renewals: List[SubscriptionRenewalOut] = []
