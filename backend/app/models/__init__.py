"""Import all models so Alembic autogenerate can see them."""
from app.models.user import User
from app.models.profile import CustomerProfile, WorkerProfile
from app.models.service import Service, ServiceCategory
from app.models.appointment import Appointment, AppointmentSlot
from app.models.order import Order, OrderItem, OrderStatusHistory, OrderMessage
from app.models.file import File
from app.models.finance import Wallet, WalletTransaction, Transaction, Payment, Commission
from app.models.cybercafe import (
    Branch, Computer, ComputerSession, PrintJob,
    DeliveryZone, Delivery, InventoryItem, InventoryTransaction, Expense
)
from app.models.notification import (
    Notification, Rating, Receipt, AuditLog, IdentityServiceRecord, Setting, CommissionRule
)
from app.models.quotation import QuotationRequest, Quotation, QuotationItem
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionRenewal
from app.models.referral import ReferralProgram, ReferralCode, ReferralSignup, ReferralReward
from app.models.support import SupportTicket, SupportMessage, FAQ
from app.models.privacy import DataPurpose, DataConsent, PrivacyRequest, DataAccessAudit
from app.models.bank import Bank, WithdrawalRequest

__all__ = [
    "User",
    "CustomerProfile",
    "WorkerProfile",
    "Service",
    "ServiceCategory",
    "Appointment",
    "AppointmentSlot",
    "Order",
    "OrderItem",
    "OrderStatusHistory",
    "OrderMessage",
    "File",
    "Wallet",
    "WalletTransaction",
    "Transaction",
    "Payment",
    "Commission",
    "Branch",
    "Computer",
    "ComputerSession",
    "PrintJob",
    "DeliveryZone",
    "Delivery",
    "InventoryItem",
    "InventoryTransaction",
    "Expense",
    "Notification",
    "Rating",
    "Receipt",
    "AuditLog",
    "IdentityServiceRecord",
    "Setting",
    "CommissionRule",
    "QuotationRequest",
    "Quotation",
    "QuotationItem",
    "SubscriptionPlan",
    "Subscription",
    "SubscriptionRenewal",
    "ReferralProgram",
    "ReferralCode",
    "ReferralSignup",
    "ReferralReward",
    "SupportTicket",
    "SupportMessage",
    "FAQ",
    "DataPurpose",
    "DataConsent",
    "PrivacyRequest",
    "DataAccessAudit",
    "Bank",
    "WithdrawalRequest",
]
