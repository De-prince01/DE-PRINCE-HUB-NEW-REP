"""Bank name-enquiry and transfer/payout helpers (Paystack with mock fallback)."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class NameEnquiryResult:
    account_name: str
    valid: bool
    source: str


@dataclass
class TransferResult:
    success: bool
    reference: str
    source: str
    message: str = ""


def mock_enquiry(bank_code: str, account_number: str) -> NameEnquiryResult:
    """Mock name-enquiry: derive a plausible account name from the digits."""
    digits = "".join(ch for ch in account_number if ch.isdigit())
    ratio = sum(int(d) for d in digits) % 3
    surnames = ["Adetola", "Okafor", "Eze", "Adebayo", "Bello", "Chukwu", "Nwachukwu", "Fasanya"]
    given = ["Emmanuel", "Blessing", "Aisha", "Chinedu", "Ngozi", "Tunde", "Halima", "Yusuf"]
    name = f"{given[ratio]} {surnames[(sum(int(d) for d in digits)) % len(surnames)]}"
    return NameEnquiryResult(account_name=name, valid=len(digits) >= 10, source="mock")


async def name_enquiry(bank_code: str, account_number: str) -> NameEnquiryResult:
    """Resolve an account name for a bank/account pair.

    Uses Paystack /bank/resolve when a secret key is configured, otherwise a
    deterministic mock so the flow is fully testable without a key.
    """
    if not settings.paystack_secret_key:
        return mock_enquiry(bank_code, account_number)

    import httpx
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://api.paystack.co/bank/resolve",
                params={"bank_code": bank_code, "account_number": account_number},
                headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
            )
            data = resp.json()
            if data.get("status") and data.get("data", {}).get("account_name"):
                return NameEnquiryResult(
                    account_name=data["data"]["account_name"],
                    valid=True,
                    source="paystack",
                )
            return NameEnquiryResult(
                account_name=data.get("message", "UNKNOWN"),
                valid=False,
                source="paystack",
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Paystack name-enquiry failed, using mock: %s", exc)
        return mock_enquiry(bank_code, account_number)


async def initiate_transfer(
    amount: float,
    bank_code: str,
    account_number: str,
    account_name: str,
    reference: str,
    reason: str = "Wallet payout",
) -> TransferResult:
    """Initiate a Paystack transfer to a bank account (mock when no key)."""
    if not settings.paystack_secret_key:
        return TransferResult(success=True, reference=reference, source="mock",
                              message="Mock transfer (no Paystack key configured)")

    import httpx
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            recipient_url = "https://api.paystack.co/transferrecipient"
            recipient_payload = {
                "type": "nuban",
                "name": account_name,
                "account_number": account_number,
                "bank_code": bank_code,
                "currency": "NGN",
            }
            rr = await client.post(
                recipient_url,
                json=recipient_payload,
                headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
            )
            rdata = rr.json()
            if not rdata.get("status"):
                return TransferResult(False, reference, "paystack", rdata.get("message", "recipient failed"))
            recipient_code = rdata["data"]["recipient_code"]

            tr = await client.post(
                "https://api.paystack.co/transfer",
                json={
                    "source": "balance",
                    "amount": int(round(amount * 100)),
                    "recipient": recipient_code,
                    "reference": reference,
                    "reason": reason,
                },
                headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
            )
            tdata = tr.json()
            if not tdata.get("status"):
                return TransferResult(False, reference, "paystack", tdata.get("message", "transfer failed"))
            return TransferResult(True, reference, "paystack", "Transfer initiated")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Paystack transfer failed (%s); marking for manual payout", exc)
        return TransferResult(False, reference, "paystack", str(exc))