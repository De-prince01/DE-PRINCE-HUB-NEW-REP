"""Enum definitions shared across models."""
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    BUSINESS_OWNER = "business_owner"
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    PRINTING_OPERATOR = "printing_operator"
    GRAPHIC_DESIGNER = "graphic_designer"
    WEB_DEVELOPER = "web_developer"
    ACADEMIC_SERVICE_WORKER = "academic_service_worker"
    TECHNICIAN = "technician"
    DELIVERY_PERSON = "delivery_person"
    PARTNER_FREELANCER = "partner_freelancer"
    CUSTOMER = "customer"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PAYMENT_PENDING = "payment_pending"
    PAID = "paid"
    RECEIVED = "received"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    WAITING_FOR_CUSTOMER = "waiting_for_customer"
    REVISION_REQUESTED = "revision_requested"
    QUALITY_CHECK = "quality_check"
    COMPLETED = "completed"
    READY_FOR_PICKUP = "ready_for_pickup"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    CARD = "card"
    ONLINE = "online"
    WALLET = "wallet"


class ComputerStatus(str, enum.Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class DeliveryType(str, enum.Enum):
    PICKUP = "pickup"
    LOCAL_DELIVERY = "local_delivery"
    CUSTOM_DELIVERY = "custom_delivery"


class AppointmentStatus(str, enum.Enum):
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    REMINDER_SENT = "reminder_sent"
    CHECKED_IN = "checked_in"
    IN_SERVICE = "in_service"
    COMPLETED = "completed"
    MISSED = "missed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class BillingCycle(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SupportCategory(str, enum.Enum):
    GENERAL = "general"
    ORDER_DISPUTE = "order_dispute"
    REFUND_REQUEST = "refund_request"
    ESCALATION = "escalation"


class SupportPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SupportTicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class RefundDecision(str, enum.Enum):
    APPROVED = "approved"
    DENIED = "denied"


class PrivacyRequestType(str, enum.Enum):
    DATA_EXPORT = "data_export"
    DATA_DELETION = "data_deletion"


class PrivacyRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    COMPLETED = "completed"


class WithdrawalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
