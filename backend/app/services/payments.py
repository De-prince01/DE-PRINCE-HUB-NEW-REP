"""Payment abstraction layer.

This defines a clean interface for payment providers (Paystack, Flutterwave).
External providers are never called with hard-coded keys — they use settings.

A DevelopmentMock provider is provided so the system runs without real keys.
"""
from __future__ import annotations

import abc
import logging
from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class PaymentIntent:
    """A payment intent returned to the client for redirect/authorization."""
    reference: str
    authorization_url: Optional[str]
    amount: float
    currency: str
    provider: str
    status: str


class PaymentProvider(abc.ABC):
    """Base class for all payment providers."""

    name: str = "base"

    @abc.abstractmethod
    async def create_payment(self, reference: str, amount: float, email: str, metadata: dict) -> PaymentIntent:
        """Create a payment intent and return an authorization URL."""

    @abc.abstractmethod
    async def verify_payment(self, reference: str) -> dict:
        """Verify a payment by its reference."""


class DevelopmentMockProvider(PaymentProvider):
    """In-development provider that always 'succeeds'.

    Used when no real payment keys are configured. Never used in production.
    """

    name = "mock"

    async def create_payment(self, reference: str, amount: float, email: str, metadata: dict) -> PaymentIntent:
        logger.warning("DevelopmentMockProvider used for payment %s", reference)
        return PaymentIntent(
            reference=reference,
            authorization_url=None,
            amount=amount,
            currency="NGN",
            provider=self.name,
            status="mock",
        )

    async def verify_payment(self, reference: str) -> dict:
        return {"status": "success", "reference": reference, "amount": None}


class PaystackProvider(PaymentProvider):
    name = "paystack"

    async def create_payment(self, reference: str, amount: float, email: str, metadata: dict) -> PaymentIntent:
        if not settings.paystack_secret_key:
            raise ValueError("Paystack secret key not configured")
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.paystack.co/transaction/initialize",
                headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
                json={
                    "email": email,
                    "amount": int(amount * 100),
                    "reference": reference,
                    "callback_url": f"{settings.allowed_hosts[0]}/orders/payment-callback",
                    "metadata": metadata,
                },
            )
            data = resp.json()
            return PaymentIntent(
                reference=reference,
                authorization_url=data["data"]["authorization_url"],
                amount=amount,
                currency="NGN",
                provider=self.name,
                status="pending",
            )

    async def verify_payment(self, reference: str) -> dict:
        if not settings.paystack_secret_key:
            raise ValueError("Paystack secret key not configured")
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
            )
            return resp.json()


class FlutterwaveProvider(PaymentProvider):
    name = "flutterwave"

    async def create_payment(self, reference: str, amount: float, email: str, metadata: dict) -> PaymentIntent:
        if not settings.flutterwave_secret_key:
            raise ValueError("Flutterwave secret key not configured")
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.flutterwave.com/v3/payments",
                headers={
                    "Authorization": f"Bearer {settings.flutterwave_secret_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "tx_ref": reference,
                    "amount": str(amount),
                    "currency": "NGN",
                    "redirect_url": f"{settings.allowed_hosts[0]}/orders/payment-callback",
                    "customer": {"email": email},
                    "customizations": {"title": settings.app_name, "description": metadata.get("description", "Payment")},
                },
            )
            data = resp.json()
            return PaymentIntent(
                reference=reference,
                authorization_url=data["data"]["link"],
                amount=amount,
                currency="NGN",
                provider=self.name,
                status="pending",
            )

    async def verify_payment(self, reference: str) -> dict:
        if not settings.flutterwave_secret_key:
            raise ValueError("Flutterwave secret key not configured")
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.flutterwave.com/v3/transactions/verify?tx_ref={reference}",
                headers={"Authorization": f"Bearer {settings.flutterwave_secret_key}"},
            )
            return resp.json()


class PaymentGateway:
    """Facade that picks the right provider based on configuration."""

    def __init__(self):
        self._provider: Optional[PaymentProvider] = None

    def get_provider(self) -> PaymentProvider:
        if self._provider:
            return self._provider
        if settings.paystack_secret_key:
            self._provider = PaystackProvider()
        elif settings.flutterwave_secret_key:
            self._provider = FlutterwaveProvider()
        else:
            self._provider = DevelopmentMockProvider()
        logger.info("Using payment provider: %s", self._provider.name)
        return self._provider

    async def create_payment(self, reference: str, amount: float, email: str, metadata: dict) -> PaymentIntent:
        return await self.get_provider().create_payment(reference, amount, email, metadata)

    async def verify_payment(self, reference: str) -> dict:
        return await self.get_provider().verify_payment(reference)


gateway = PaymentGateway()
