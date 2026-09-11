"""Privacy models: purposes, consents, deletion/export requests, access audit (spec §59)."""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint,
    Enum as SAEnum,
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import PrivacyRequestType, PrivacyRequestStatus


class DataPurpose(Base):
    __tablename__ = "data_purposes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purpose_code = Column(String(100), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    data_collected = Column(JSON, default=list)
    retention_days = Column(Integer, default=30, nullable=False)
    is_required = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class DataConsent(Base):
    __tablename__ = "data_consents"
    __table_args__ = (UniqueConstraint("user_id", "purpose_code", name="uq_user_purpose"),)

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    purpose_code = Column(String(100), nullable=False)
    granted = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class PrivacyRequest(Base):
    __tablename__ = "privacy_requests"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_number = Column(String(50), unique=True, nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    request_type = Column(SAEnum(PrivacyRequestType, name="privacy_request_type"), nullable=False)
    status = Column(SAEnum(PrivacyRequestStatus, name="privacy_request_status"),
                    default="pending", nullable=False)
    reason = Column(Text)
    processed_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    requested_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime(timezone=True))

    user = relationship("User", foreign_keys=[user_id])
    processor = relationship("User", foreign_keys=[processed_by])


class DataAccessAudit(Base):
    __tablename__ = "data_access_audits"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    actor_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(Uuid(as_uuid=True))
    details = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)