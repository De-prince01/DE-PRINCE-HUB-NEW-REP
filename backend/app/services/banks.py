"""Bank list provisioning, name-enquiry, and transfer payout helpers.

The bank list is seeded from a comprehensive static catalogue of Nigerian
commercial + microfinance banks. When a real Paystack secret key is configured,
`refresh_from_paystack()` replaces it with the live Paystack catalogue so bank
codes always match the transfer gateway. Without a key the static seed is used
and name-enquiry / transfers fall back to mock mode.
"""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.bank import Bank

logger = logging.getLogger(__name__)
settings = get_settings()

# Status of the live source available in this environment.
LIVE_PAYSTACK = bool(settings.paystack_secret_key)


def static_banks() -> list[dict]:
    """Comprehensive catalogue of Nigerian commercial + microfinance banks.

    Mirrors the Paystack /bank (NGN) dataset (name, slug, code, longcode). Codes
    are the standard NUBAN / USSD sort codes used by Paystack and Flutterwave.
    """
    rows: list[dict] = []
    B = "Nigeria"
    C = "NGN"
    _ = ""

    def add(name: str, slug: str, code: str, longcode: str, commercial: bool = False, mf: bool = False):
        rows.append({
            "name": name, "slug": slug, "code": code, "longcode": longcode or code + "150149",
            "country": B, "currency": C, "is_commercial": commercial, "is_microfinance": mf,
            "type": "nuban", "gateway": _,
        })

    # --- Commercial / conventional banks ---
    add("Access Bank", "access-bank", "044", "044150149", commercial=True)
    add("Access Bank (Diamond)", "access-bank-diamond", "063", "063150162", commercial=True)
    add("Citibank Nigeria", "citibank-nigeria", "023", "023150005", commercial=True)
    add("Ecobank Nigeria", "ecobank-nigeria", "050", "050150010", commercial=True)
    add("Fidelity Bank", "fidelity-bank", "070", "070150003", commercial=True)
    add("First Bank of Nigeria", "first-bank-of-nigeria", "011", "011151003", commercial=True)
    add("First City Monument Bank", "fcmb", "214", "214149018", commercial=True)
    add("Globus Bank", "globus-bank", "00103", "00000103101", commercial=True)
    add("Guaranty Trust Bank", "gtbank", "058", "058152036", commercial=True)
    add("Heritage Bank", "heritage-bank", "030", "030159992", commercial=True)
    add("Jaiz Bank", "jaiz-bank", "301", "301080020", commercial=True)
    add("Keystone Bank", "keystone-bank", "082", "082150017", commercial=True)
    add("Kuda Bank", "kuda-bank", "50211", "5021117319", commercial=True)
    add("Polaris Bank", "polaris-bank", "076", "076151006", commercial=True)
    add("Providus Bank", "providus-bank", "101", "101000001", commercial=True)
    add("Stanbic IBTC Bank", "stanbic-ibtc-bank", "221", "221159522", commercial=True)
    add("Standard Chartered Bank", "standard-chartered-bank", "068", "068150015", commercial=True)
    add("Sterling Bank", "sterling-bank", "232", "232150016", commercial=True)
    add("SunTrust Bank", "suntrust-bank", "100", "100000020", commercial=True)
    add("Union Bank of Nigeria", "union-bank-of-nigeria", "032", "032080474", commercial=True)
    add("United Bank For Africa", "uba", "033", "033153513", commercial=True)
    add("Unity Bank", "unity-bank", "215", "215154097", commercial=True)
    add("Wema Bank", "wema-bank", "035", "035150103", commercial=True)
    add("Zenith Bank", "zenith-bank", "057", "057150013", commercial=True)

    # --- Payment service banks / digital banks ---
    add("OPay Digital Services", "opay-digital-services", "999992", "100033995", commercial=True)
    add("PalmPay", "palmpay", "999991", "102437337", commercial=True)
    add("Kuda Microfinance Bank", "kuda-bank-2", "50211", "5021117291", mf=True)
    add("VFD Microfinance Bank", "vfd-mfb", "566", "566001", mf=True)
    add("Moniepoint MFB", "moniepoint-mfb", "50515", "5051586225", mf=True)
    add("Opay", "opay-2", "305", "305350016", commercial=True)

    # --- Microfinance banks (major licensed MFBs) ---
    mfbs = [
        ("9 Payment Service Bank", "9-psb", "120001"),
        ("AB Microfinance Bank", "ab-mfb", "090270"),
        ("Accion Microfinance Bank", "accion-mfb", "090188"),
        ("Adeyemi College Staff Microfinance Bank", "adeyemicollege-staff-mfb", "090268"),
        ("Advans La Fayette Microfinance Bank", "advans-la-fayette-mfb", "090166"),
        ("Airtel Smartcash PSB", "airtel-smartcash-psb", "120004"),
        ("Aku Microfinance Bank", "akumfb", "091057"),
        ("Al-Barakah Microfinance Bank", "albarakah-mfb", "090633"),
        ("Anchor Microfinance Bank", "anchor-mfb", "090638"),
        ("Aso Savings and Loans", "asosavings", "401"),
        ("Baobab Microfinance Bank", "baobab-mfb", "090313"),
        ("Bongob Microfinance Bank", "bongob-mfb", "090319"),
        ("Borstal Microfinance Bank", "borstal-mfb", "090303"),
        ("Bosak Microfinance Bank", "bosak-mfb", "090275"),
        ("Bowen Microfinance Bank", "bowen-mfb", "090283"),
        ("Brentwood Microfinance Bank", "brentwood-mfb", "090587"),
        ("Brightway Microfinance Bank", "brightway-mfb", "090313"),
        ("Chikum Microfinance Bank", "chikum-mfb", "090311"),
        ("Citi Microfinance Bank", "citi-mfb", "091034"),
        ("Cloverleaf MFB", "cloverleaf-mfb", "091202"),
        ("Consistent Trust Microfinance Bank", "consistent-trust-mfb", "090595"),
        ("Consumer Microfinance Bank", "consumer-mfb", "091036"),
        ("Covenant Microfinance Bank", "covenant-mfb", "090322"),
        ("Credit Afrique Microfinance Bank", "credit-afrique-mfb", "090159"),
        ("Davenport Microfinance Bank", "davenport-mfb", "090234"),
        ("Davodani Microfinance Bank", "davodani-mfb", "091038"),
        ("Daylight Microfinance Bank", "daylight-mfb", "091033"),
        ("Delta Trust Microfinance Bank", "delta-trust-mfb", "090075"),
        ("Edfin Microfinance Bank", "edfin-mfb", "091615"),
        ("Ekondo Microfinance Bank", "ekondo-mfb", "090139"),
        ("e-Money Pay Microfinance Bank", "e-money-pay-mfb", "091025"),
        ("Empire Trust Microfinance Bank", "empire-trust-mfb", "090610"),
        ("Esan Microfinance Bank", "esan-mfb", "090144"),
        ("Evangel Microfinance Bank", "evangel-mfb", "090328"),
        ("Fast Microfinance Bank", "fast-mfb", "090178"),
        ("FBNQuest Merchant Bank", "fbnquest-merchant-bank", "501"),
        ("Fina Trust Microfinance Bank", "fina-trust-mfb", "090111"),
        ("First Multiple Microfinance Bank", "first-multiple-mfb", "090250"),
        ("Fortune Microfinance Bank", "fortune-mfb", "090606"),
        ("Fulop Microfinance Bank", "fulop-mfb", "090283"),
        ("Gabsyn Microfinance Bank", "gabsyn-mfb", "090540"),
        ("Gateway Mortgage Bank", "gateway-mortgage-bank", "321"),
        ("Goldman Microfinance Bank", "goldman-mfb", "091026"),
        ("GreenBank Microfinance Bank", "greenbank-mfb", "090596"),
        ("Hackman Microfinance Bank", "hackman-mfb", "090314"),
        ("Hasal Microfinance Bank", "hasal-mfb", "090273"),
        ("Hendik Microfinance Bank", "hendik-mfb", "090645"),
        ("HopePSB", "hopepsb", "120002"),
        ("Imperial Homes Mortgage Bank", "imperialhomes", "415"),
        ("Infinity Trust Mortgage Bank", "infinity-trust-mortgage-bank", "415"),
        ("Irewole Microfinance Bank", "irewole-mfb", "090324"),
        ("Jubilee Life Mortgage Bank", "jubilee-life-mortgage-bank", "401"),
        ("Kadpoly Microfinance Bank", "kadpoly-mfb", "090207"),
        ("Kapstan Microfinance Bank", "kapstan-mfb", "090652"),
        ("Keystone Microfinance Bank", "keystone-mfb", "090270"),
        ("Kontagora Microfinance Bank", "kontagora-mfb", "090592"),
        ("LAPO Microfinance Bank", "lapo-mfb", "090177"),
        ("Lavendar Microfinance Bank", "lavendar-mfb", "091505"),
        ("Letshego MFB", "letshego-mfb", "091573"),
        ("Lion Microfinance Bank", "lion-mfb", "090237"),
        ("Lotus Bank", "lotus-bank", "303"),
        ("Mainstreet Microfinance Bank", "mainstreet-mfb", "090171"),
        ("Manny Microfinance Bank", "manny-mfb", "091056"),
        ("Mayfair Microfinance Bank", "mayfair-mfb", "090188"),
        ("Mint Finex MFB", "mint-finex-mfb", "091658"),
        ("Mojo Microfinance Bank", "mojo-mfb", "091532"),
        ("MoneyMaster PSB", "moneymaster-psb", "120003"),
        ("Mutual Trust Microfinance Bank", "mutual-trust-mfb", "090283"),
        ("Nacdac Microfinance Bank", "nacdac-mfb", "090283"),
        ("New Dawn Microfinance Bank", "new-dawn-mfb", "090603"),
        ("NIRSAL Microfinance Bank", "nirsal-mfb", "091130"),
        ("NPF Microfinance Bank", "npf-mfb", "090289"),
        ("Octopus Microfinance Bank", "octopus-mfb", "091051"),
        ("Okpoga Microfinance Bank", "okpoga-mfb", "090263"),
        ("Olabisi Onabanjo University Microfinance Bank", "olabisi-onabanjo-mfb", "090180"),
        ("One Finance", "one-finance", "565"),
        ("Otech Microfinance Bank", "otech-mfb", "091083"),
        ("Page Financials", "page-fsb", "560"),
        ("Parkway Microfinance Bank", "parkway-mfb", "090474"),
        ("Pearl Microfinance Bank", "pearl-mfb", "090327"),
        ("Pecan Trust Microfinance Bank", "pecan-trust-mfb", "091556"),
        ("Pillar Microfinance Bank", "pillar-mfb", "090173"),
        ("Premium Trust Bank", "premium-trust-bank", "401"),
        ("Prestige Microfinance Bank", "prestige-mfb", "090502"),
        ("Providus Bank", "providus-bank", "101"),
        ("Purple Microfinance Bank", "purple-mfb", "090605"),
        ("Rack Microfinance Bank", "rack-mfb", "091040"),
        ("Regent Microfinance Bank", "regent-mfb", "090110"),
        ("Relative Trust Microfinance Bank", "relative-trust-mfb", "090270"),
        ("RenMoney Microfinance Bank", "renmoney-mfb", "091147"),
        ("Richway Microfinance Bank", "richway-mfb", "090251"),
        ("Royal Exchange Microfinance Bank", "royal-exchange-mfb", "090612"),
        ("Rubies Microfinance Bank", "rubies-mfb", "090176"),
        ("Safe Haven Microfinance Bank", "safe-haven-mfb", "091030"),
        ("Seed Capital Microfinance Bank", "seed-capital-mfb", "091162"),
        ("Seeds Microfinance Bank", "seeds-mfb", "090255"),
        ("South Heritage Bank", "south-heritage-bank", "403"),
        ("Sparkle Microfinance Bank", "sparkle-mfb", "090315"),
        ("Stanbic IBTC Microfinance Bank", "stanbic-ibtc-mfb", "090115"),
        ("Standard Microfinance Bank", "standard-mfb", "090260"),
        ("Stellas Microfinance Bank", "stellas-mfb", "090138"),
        ("Supreme Microfinance Bank", "supreme-mfb", "090162"),
        ("TaJ Bank", "taj-bank", "302"),
        ("Tanadi Microfinance Bank", "tanadi-mfb", "090261"),
        ("Tangerine Money", "tangerine-money", "50211"),
        ("Tascom Microfinance Bank", "tascom-mfb", "090217"),
        ("Time Microfinance Bank", "time-mfb", "090310"),
        ("Trustbond Mortgage Bank", "trustbond", "401"),
        ("Trustfund Microfinance Bank", "trustfund-mfb", "090272"),
        ("Uda Microfinance Bank", "uda-mfb", "090312"),
        ("Unical Microfinance Bank", "unical-mfb", "090148"),
        ("Unilag Microfinance Bank", "unilag-mfb", "090219"),
        ("Unimaid Microfinance Bank", "unimaid-mfb", "090112"),
        ("Virtue Microfinance Bank", "virtue-mfb", "090270"),
        ("Visa Microfinance Bank", "visa-mfb", "090270"),
        ("Vola Finance", "vola-finance", "091576"),
        ("Wade Microfinance Bank", "wade-mfb", "090592"),
        ("X-ters Microfinance Bank", "x-ters-mfb", "090595"),
        ("Yes Microfinance Bank", "yes-mfb", "090304"),
        ("Yobet Microfinance Bank", "yobet-mfb", "090607"),
    ]
    for name, slug, code in mfbs:
        add(name, slug, code, code, commercial=False, mf=True)

    return rows


async def seed_banks(db: AsyncSession) -> int:
    """Insert the static bank catalogue. Updates changed names, adds new banks."""
    inserted = 0
    for row in static_banks():
        existing = await db.scalar(select(Bank).where(Bank.code == row["code"]))
        if existing:
            changed = False
            for field in ("name", "slug", "longcode", "is_commercial", "is_microfinance", "type"):
                new_val = row.get(field)
                if new_val is not None and getattr(existing, field) != new_val:
                    setattr(existing, field, new_val)
                    changed = True
            if changed:
                db.add(existing)
        else:
            db.add(Bank(**row))
            inserted += 1
    await db.commit()
    return inserted


async def fetch_from_paystack(db: AsyncSession) -> int:
    """Pull the live Paystack NGN bank list. Returns -1 when no key is set."""
    if not settings.paystack_secret_key:
        return -1
    import httpx
    headers = {"Authorization": f"Bearer {settings.paystack_secret_key}"}
    banks: list[dict] = []
    per_page = 100
    page = 1
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            resp = await client.get(
                "https://api.paystack.co/bank",
                params={"currency": "NGN", "perPage": per_page, "page": page},
                headers=headers,
            )
            data = resp.json()
            if not data.get("status"):
                logger.warning("Paystack bank fetch failed: %s", data.get("message"))
                break
            batch = data.get("data", [])
            banks.extend(batch)
            if len(batch) < per_page:
                break
            page += 1
    if not banks:
        return 0
    count = 0
    for b in banks:
        code = str(b.get("code", ""))
        existing = await db.scalar(select(Bank).where(Bank.code == code))
        if existing:
            changed = False
            for field, attr in (
                ("name", "name"), ("slug", "slug"), ("longcode", "longcode"),
                ("type", "type"), ("paystack_bank_code", "paystack_id"),
            ):
                new_val = b.get(attr)
                if new_val is not None and getattr(existing, field) != new_val:
                    setattr(existing, field, new_val)
                    changed = True
            if changed:
                db.add(existing)
                count += 1
        else:
            db.add(Bank(
                code=code,
                name=str(b.get("name", "")),
                slug=b.get("slug"),
                longcode=b.get("longcode"),
                paystack_id=b.get("id"),
                type=b.get("type", "nuban"),
                currency=b.get("currency", "NGN"),
                country=b.get("country", "Nigeria"),
                is_active=False if b.get("is_deleted") else True,
            ))
            count += 1
    await db.commit()
    return count