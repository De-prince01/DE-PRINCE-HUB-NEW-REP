"""Service catalogue schemas (service engine)."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class ServiceCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    revenue_stream: Optional[str] = None


class ServiceCategoryOut(ServiceCategoryBase):
    id: UUID
    slug: str

    model_config = ConfigDict(from_attributes=True)


class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    revenue_stream: Optional[str] = None


class ServiceCategoryDetail(ServiceCategoryOut):
    services: List["ServiceOut"] = []


class ServiceBase(BaseModel):
    category_id: UUID
    name: str = Field(..., min_length=1, max_length=300)
    icon: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None

    price_type: str = "fixed"                # fixed | quote | range
    base_price: float = Field(default=0, ge=0)
    price_unit: str = "fixed"
    quotation_required: bool = False
    minimum_price: Optional[float] = None
    maximum_price: Optional[float] = None
    estimated_processing_time: Optional[str] = None
    estimated_duration: Optional[str] = None

    requirements: Optional[List[str]] = None
    required_documents: Optional[List[str]] = None
    requires_file_upload: bool = False
    requires_description: bool = True
    requires_physical_presence: bool = False
    requires_biometric: bool = False
    requires_photograph: bool = False
    requires_signature: bool = False
    requires_appointment: bool = False
    requires_staff: bool = False
    requires_worker: bool = False

    delivery_available: bool = False
    pickup_available: bool = False
    payment_required: bool = True

    commission_type: str = "percentage"      # percentage | fixed
    commission_value: float = Field(default=20.0, ge=0)

    branch_availability: Optional[List[str]] = None
    service_instructions: Optional[str] = None
    faq: Optional[List[dict]] = None

    official_provider: Optional[str] = None
    official_provider_url: Optional[str] = None
    official_fee: Optional[float] = None
    deprince_fee: Optional[float] = None
    last_verified_date: Optional[datetime] = None
    verification_status: str = "not_verified"  # verified | not_verified | needs_review | suspended

    is_seasonal: bool = False
    season_months: Optional[List[int]] = None
    season_label: Optional[str] = None

    is_active: bool = True
    display_order: int = 0


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=300)
    icon: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None

    price_type: Optional[str] = None
    base_price: Optional[float] = Field(default=None, ge=0)
    price_unit: Optional[str] = None
    quotation_required: Optional[bool] = None
    minimum_price: Optional[float] = None
    maximum_price: Optional[float] = None
    estimated_processing_time: Optional[str] = None
    estimated_duration: Optional[str] = None

    requirements: Optional[List[str]] = None
    required_documents: Optional[List[str]] = None
    requires_file_upload: Optional[bool] = None
    requires_description: Optional[bool] = None
    requires_physical_presence: Optional[bool] = None
    requires_biometric: Optional[bool] = None
    requires_photograph: Optional[bool] = None
    requires_signature: Optional[bool] = None
    requires_appointment: Optional[bool] = None
    requires_staff: Optional[bool] = None
    requires_worker: Optional[bool] = None

    delivery_available: Optional[bool] = None
    pickup_available: Optional[bool] = None
    payment_required: Optional[bool] = None

    commission_type: Optional[str] = None
    commission_value: Optional[float] = Field(default=None, ge=0)

    branch_availability: Optional[List[str]] = None
    service_instructions: Optional[str] = None
    faq: Optional[List[dict]] = None

    official_provider: Optional[str] = None
    official_provider_url: Optional[str] = None
    official_fee: Optional[float] = None
    deprince_fee: Optional[float] = None
    last_verified_date: Optional[datetime] = None
    verification_status: Optional[str] = None

    is_seasonal: Optional[bool] = None
    season_months: Optional[List[int]] = None
    season_label: Optional[str] = None

    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class ServiceOut(ServiceBase):
    id: UUID
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


ServiceCategoryDetail.model_rebuild()
