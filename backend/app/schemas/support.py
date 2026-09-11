"""Support centre schemas (spec §57)."""
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FAQCreate(BaseModel):
    question: str = Field(..., max_length=300)
    answer: str
    category: Optional[str] = "general"
    is_active: Optional[bool] = True


class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class FAQOut(BaseModel):
    id: UUID
    question: str
    answer: str
    category: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SupportMessageIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)


class SupportMessageOut(BaseModel):
    id: UUID
    sender_id: UUID
    sender_role: str
    sender_name: Optional[str] = None
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupportTicketCreate(BaseModel):
    subject: str = Field(..., max_length=200)
    category: str = Field("general", max_length=30)
    description: str = Field(..., min_length=1)
    priority: Optional[str] = "medium"
    order_id: Optional[UUID] = None


class SupportTicketStatusUpdate(BaseModel):
    status: str


class SupportEscalateIn(BaseModel):
    reason: Optional[str] = None


class SupportRefundDecisionIn(BaseModel):
    decision: str            # approved | denied
    amount: Optional[float] = None


class SupportTicketOut(BaseModel):
    id: UUID
    ticket_number: str
    customer_id: UUID
    customer_name: Optional[str] = None
    order_id: Optional[UUID] = None
    order_number: Optional[str] = None
    subject: str
    category: str
    priority: str
    status: str
    description: str
    is_escalated: bool
    escalation_reason: Optional[str] = None
    refund_decision: Optional[str] = None
    refund_amount: Optional[float] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[SupportMessageOut] = []

    model_config = ConfigDict(from_attributes=True)