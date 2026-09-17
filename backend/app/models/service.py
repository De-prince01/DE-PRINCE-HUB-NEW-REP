"""Service catalogue models.

Implements the configurable "service engine" — a dynamic service-management
system where every service carries its full workflow definition (price type,
requirements, physical/biometric flags, official provider/fee, commission,
delivery/pickup, verification) and can be created/modified by an admin without
changing source code.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, String, Text, Boolean, Integer, Float, ForeignKey,
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String(100))
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    revenue_stream = Column(String(60))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    services = relationship("Service", back_populates="category")


class Service(Base):
    """A configurable service with a complete workflow definition.

    The service engine is intentionally normalized on a single wide table so
    existing consumers (orders, printing, POS, payments) remain unchanged while
    adding the rich, admin-editable configuration surfaced on the storefront.
    """
    __tablename__ = "services"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(Uuid(as_uuid=True), ForeignKey("service_categories.id"), nullable=False)

    # Core catalogue fields
    name = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, nullable=False)
    icon = Column(String(100))
    image_url = Column(String(500))
    description = Column(Text)
    short_description = Column(String(500))
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0)

    # Pricing
    price_type = Column(String(20), default="fixed")          # fixed | quote | range | conditional
    base_price = Column(Float, nullable=False, default=0)     # fixed price (or "record found" price for conditional)
    price_unit = Column(String(50), default="fixed")
    quotation_required = Column(Boolean, default=False, nullable=False)
    minimum_price = Column(Float)
    maximum_price = Column(Float)
    estimated_processing_time = Column(String(100))
    estimated_duration = Column(String(100))  # legacy alias

    # Pricing management (admin-editable, no code changes required)
    promotional_price = Column(Float)  # optional discounted advertised price
    processing_fee = Column(Float)     # extra DE-PRINCE processing fee
    no_record_price = Column(Float)    # conditional services: charge when no record is found
    price_notice = Column(Text)        # customer-facing pricing notice (e.g. conditional-cost explanation)
    bookable = Column(Boolean, default=True, nullable=False)  # False = visible but "Service Not Available"

    # Requirements
    requirements = Column(JSON)
    required_documents = Column(JSON)
    requires_file_upload = Column(Boolean, default=False, nullable=False)
    requires_description = Column(Boolean, default=True, nullable=False)
    requires_physical_presence = Column(Boolean, default=False, nullable=False)
    requires_biometric = Column(Boolean, default=False, nullable=False)
    requires_photograph = Column(Boolean, default=False, nullable=False)
    requires_signature = Column(Boolean, default=False, nullable=False)
    requires_appointment = Column(Boolean, default=False, nullable=False)
    requires_staff = Column(Boolean, default=False, nullable=False)
    requires_worker = Column(Boolean, default=False, nullable=False)

    # Delivery / pickup / payments
    delivery_available = Column(Boolean, default=False, nullable=False)
    pickup_available = Column(Boolean, default=False, nullable=False)
    payment_required = Column(Boolean, default=True, nullable=False)

    # Commission configuration
    commission_type = Column(String(20), default="percentage")  # percentage | fixed
    commission_value = Column(Float, default=20.0)              # % or fixed amount

    # Branch availability
    branch_availability = Column(JSON)  # list of branch slugs

    # Instructions + how it works / faq
    service_instructions = Column(Text)
    faq = Column(JSON)

    # Official provider (government/third-party) information
    official_provider = Column(String(200))
    official_provider_url = Column(String(500))
    official_fee = Column(Float)
    deprince_fee = Column(Float)
    last_verified_date = Column(DateTime(timezone=True))
    verification_status = Column(String(30), default="not_verified")  # verified | not_verified | needs_review | suspended

    # Seasonality (spec 61): seasonal services like JAMB vs year-round services
    is_seasonal = Column(Boolean, default=False, nullable=False)
    season_months = Column(JSON)          # list of month numbers 1..12 when in season
    season_label = Column(String(200))    # human label, e.g. "JAMB/UTME season (Jan-May)"

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("ServiceCategory", back_populates="services")
