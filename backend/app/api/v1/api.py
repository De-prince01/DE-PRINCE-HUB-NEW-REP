"""API v1 router aggregation."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, services, orders, payments, notifications, admin, computers,
    health, printing, inventory, pos, workers, finance, receipts, identity,
    appointments, delivery, quotations, subscriptions, referrals, support, analytics,
    privacy, business, owner, banking, admin_banking,
    verifications,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(services.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(notifications.router)
api_router.include_router(admin.router)
api_router.include_router(computers.router)
api_router.include_router(printing.router)
api_router.include_router(inventory.router)
api_router.include_router(pos.router)
api_router.include_router(workers.router)
api_router.include_router(finance.router)
api_router.include_router(receipts.router)
api_router.include_router(identity.router)
api_router.include_router(appointments.router)
api_router.include_router(delivery.router)
api_router.include_router(quotations.router)
api_router.include_router(subscriptions.router)
api_router.include_router(referrals.router)
api_router.include_router(support.router)
api_router.include_router(analytics.router)
api_router.include_router(privacy.router)
api_router.include_router(business.router)
api_router.include_router(owner.router)
api_router.include_router(banking.router)
api_router.include_router(admin_banking.router)
api_router.include_router(verifications.router)
api_router.include_router(health.router)
