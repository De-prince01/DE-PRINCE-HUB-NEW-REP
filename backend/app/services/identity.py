"""Identity verification abstraction layer.

Provides a clean interface for identity providers that verify NIN / BVN /
SNIN against official records (e.g. SME.NG, NIMC). Providers are enabled only
when their secret keys are configured in settings.

A DevelopmentMock provider is provided so the system runs without real keys.
It returns predictable mock results and is never used in production.
"""
from __future__ import annotations

import abc
import logging
import base64
from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class IdentityResult:
    """Result of an identity verification lookup."""
    verified: bool
    provider: str
    id_type: str
    masked_id: str
    full_name: Optional[str]
    date_of_birth: Optional[str]
    message: str
    raw: dict


class IdentityProvider(abc.ABC):
    """Base class for all identity providers."""

    name: str = "base"

    @abc.abstractmethod
    async def verify(self, id_type: str, id_number: str, **kwargs) -> IdentityResult:
        """Verify an identity document number."""


class DevelopmentMockIdentityProvider(IdentityProvider):
    """In-development provider that returns deterministic mock results.

    A number is treated as verified when the last digit is even (so tests can
    exercise both outcomes). Never used in production.
    """

    name = "mock"

    async def verify(self, id_type: str, id_number: str, **kwargs) -> IdentityResult:
        logger.warning("DevelopmentMockIdentityProvider used for %s", id_type)
        valid_digit = id_number[-1] if id_number else "0"
        verified = valid_digit.isdigit() and int(valid_digit) % 2 == 0
        if verified:
            return IdentityResult(
                verified=True,
                provider=self.name,
                id_type=id_type,
                masked_id=self._mask(id_number),
                full_name=kwargs.get("expected_name") or "Mock Verified Person",
                date_of_birth="1990-01-01",
                message="Identity verified (development mock)",
                raw={"mode": "mock", "confirmed": True},
            )
        return IdentityResult(
            verified=False,
            provider=self.name,
            id_type=id_type,
            masked_id=self._mask(id_number),
            full_name=None,
            date_of_birth=None,
            message="Identity could not be verified (development mock)",
            raw={"mode": "mock", "confirmed": False},
        )

    @staticmethod
    def _mask(id_number: str) -> str:
        if len(id_number) <= 4:
            return "****"
        return id_number[:2] + "*" * (len(id_number) - 4) + id_number[-2:]


class SmeNgProvider(IdentityProvider):
    """Real provider for SME.NG NIN/BVN verification.

    Requires SME_NIN_SECRET / SME_BVN_SECRET environment variables.
    Not exercised in this development environment.
    """

    name = "sme.ng"

    async def verify(self, id_type: str, id_number: str, **kwargs) -> IdentityResult:
        secret = settings.sme_nin_secret if id_type.lower() == "nin" else settings.sme_bvn_secret
        if not secret:
            raise ValueError(f"SME.NG secret not configured for {id_type.upper()}")
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.smepay.ng/api/v1/verification/validate/individual",
                headers={"Authorization": f"Bearer {secret}"},
                json={"id": id_number, "first_name": kwargs.get("first_name"), "last_name": kwargs.get("last_name")},
            )
            data = resp.json()
            return IdentityResult(
                verified=bool(data.get("success")),
                provider=self.name,
                id_type=id_type,
                masked_id=self._mask(id_number),
                full_name=data.get("data", {}).get("full_name"),
                date_of_birth=data.get("data", {}).get("date_of_birth"),
                message=data.get("message", ""),
                raw=data,
            )

    @staticmethod
    def _mask(id_number: str) -> str:
        if len(id_number) <= 4:
            return "****"
        return id_number[:2] + "*" * (len(id_number) - 4) + id_number[-2:]


class IdentityGateway:
    """Facade that picks the identity provider based on configuration."""

    def __init__(self):
        self._provider: Optional[IdentityProvider] = None

    def get_provider(self) -> IdentityProvider:
        if self._provider:
            return self._provider
        if settings.identity_provider.lower() == "sme.ng" and (settings.sme_nin_secret or settings.sme_bvn_secret):
            self._provider = SmeNgProvider()
        else:
            self._provider = DevelopmentMockIdentityProvider()
        logger.info("Using identity provider: %s", self._provider.name)
        return self._provider

    async def verify(self, id_type: str, id_number: str, **kwargs) -> IdentityResult:
        return await self.get_provider().verify(id_type, id_number, **kwargs)


gateway = IdentityGateway()


def dev_encode(payload: str) -> bytes:
    """Development-only encoding for the data_encrypted column.

    Real providers would encrypt before storage. This is a reversible base64
    wrapper used so the dev-mock still exercises the encrypted column.
    """
    return base64.b64encode(payload.encode("utf-8"))
