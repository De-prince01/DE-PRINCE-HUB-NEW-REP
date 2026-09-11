"""Privacy centre schemas (spec §59)."""
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DataPurposeOut(BaseModel):
    id: UUID
    purpose_code: str
    title: str
    description: str
    data_collected: Optional[list] = None
    retention_days: int
    is_required: bool

    model_config = ConfigDict(from_attributes=True)


class DataConsentOut(BaseModel):
    purpose_code: str
    title: str
    granted: bool
    is_required: bool

    model_config = ConfigDict(from_attributes=True)


class DataConsentUpdate(BaseModel):
    granted: bool


class PrivacyRequestCreate(BaseModel):
    request_type: str
    reason: Optional[str] = None


class PrivacyRequestProcess(BaseModel):
    action: str            # approve | deny


class PrivacyRequestOut(BaseModel):
    id: UUID
    request_number: str
    request_type: str
    status: str
    reason: Optional[str] = None
    requested_at: datetime
    processed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DataExportOut(BaseModel):
    user: dict
    consents: List[dict]
    orders: List[dict]
    messages: List[dict]
    support_tickets: List[dict]
    wallet_transactions: List[dict]
    generated_at: str
    expires_in_days: int


class AuditOut(BaseModel):
    id: UUID
    action: str
    entity_type: Optional[str] = None
    actor_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaskTestOut(BaseModel):
    original: str
    masked: str