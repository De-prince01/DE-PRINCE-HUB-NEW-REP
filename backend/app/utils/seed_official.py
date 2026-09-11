"""Idempotent seed for the official-service catalogue (JAMB / NYSC / CAC).

Adds legitimate assistance services configured with the honest flags and fee
split required by the spec (PHYSICAL PRESENCE REQUIRED / BIOMETRIC CAPTURE
REQUIRED / official provider + fee / DE-PRINCE service fee / total). These
exist under the "online-services" category so the existing storefront,
ordering and appointment flows reuse them without new backend code. No fake
JAMB/NYSC/CAC records or integrations are created — verification_status stays
honest and the platform never claims biometric capture occurred.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.service import ServiceCategory, Service


def svc(cat, common=None, **overrides):
    merged = {**(common or {}), **overrides}
    merged.setdefault("price_type", "fixed")
    merged.setdefault("is_active", True)
    return Service(category_id=cat.id, **merged)


async def seed_official():
    async with SessionLocal() as db:
        cat = (
            await db.execute(select(ServiceCategory).where(ServiceCategory.slug == "online-services"))
        ).scalar_one_or_none()
        if not cat:
            print("online-services category missing; run app.utils.seed first")
            return

        existing = {s.slug for s in (await db.execute(select(Service))).scalars().all()}
        added = 0

        def add(s):
            nonlocal added
            if s.slug not in existing:
                db.add(s)
                existing.add(s.slug)
                added += 1

        # ---------------- JAMB (https://www.jamb.gov.ng) ----------------
        jamb_common = dict(
            requires_file_upload=True,
            estimated_processing_time="With centre appointment",
            requires_description=True,
            requires_physical_presence=True,
            requires_biometric=True,
            requires_photograph=True,
            requires_signature=False,
            requires_appointment=True,
            requires_staff=True,
            official_provider="Joint Admissions and Matriculation Board (JAMB)",
            official_provider_url="https://www.jamb.gov.ng",
            verification_status="not_verified",
            requirements=[
                "Meet at the De-Prince centre for the appointment",
                "Bring a valid means of identification",
                "BIOMETRIC CAPTURE REQUIRED — completed personally via the official/authorized process only",
            ],
            required_documents=[
                "Phone number & email used for registration",
                "Valid identity document (National ID / passport / driving licence)",
                "Passport photograph (collected at biometric capture point)",
            ],
            service_instructions=(
                "We assist with legitimate JAMB registration flow on official portals. BIOMETRIC "
                "CAPTURE REQUIRED — it must be completed personally through the official/authorized "
                "process at an approved centre. We never impersonate JAMB, never manipulate records, "
                "and never bypass CAPTCHA/MFA. De-Prince fees shown are our assistance fee in addition "
                "to the official JAMB fee."
            ),
        )

        add(svc(cat, jamb_common, name="JAMB UTME Registration Assistance", slug="jamb-utme-registration",
                base_price=2000, price_unit="registration", official_fee=7700, deprince_fee=2000,
                description="Assistance with your legitimate JAMB UTME registration on the official JAMB platform."))
        add(svc(cat, jamb_common, name="JAMB Direct Entry Registration Assistance", slug="jamb-direct-entry",
                base_price=2000, price_unit="registration", official_fee=7700, deprince_fee=2000,
                description="Assistance with your JAMB Direct Entry registration (officially available)."))
        add(svc(cat, jamb_common, name="JAMB Profile Creation Assistance", slug="jamb-profile-creation",
                base_price=1000, price_unit="profile", official_fee=100, deprince_fee=1000,
                requires_physical_presence=False, requires_biometric=False,
                requires_photograph=False, requires_appointment=False, requires_staff=False,
                description="Help creating your JAMB profile on the official portal (with your own details).",
                requirements=["Provide your own correct details"],
                service_instructions=(
                    "We help you complete the official JAMB profile steps. You must use your own "
                    "correct details; we never create or alter records on your behalf beyond what "
                    "you directly authorize on the official portal."
                )))
        add(svc(cat, jamb_common, name="JAMB e-PIN Guidance", slug="jamb-epin-guidance",
                base_price=500, price_unit="epin", official_fee=0, deprince_fee=500,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False, requires_staff=False, requires_description=False,
                description="Guidance purchasing and redeeming your JAMB e-PIN from official sources.",
                requirements=["JAMB e-PIN purchased via official channels only"]))
        add(svc(cat, jamb_common, name="JAMB Examination Slip Printing", slug="jamb-exam-slip-printing",
                base_price=500, price_unit="print", official_fee=0, deprince_fee=500,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False, requires_staff=False,
                description="Print your JAMB examination slip from the official portal."))
        add(svc(cat, jamb_common, name="JAMB Result Checking Assistance", slug="jamb-result-checking",
                base_price=1000, price_unit="check", official_fee=0, deprince_fee=1000,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False,
                description="Assistance checking JAMB results / UTME per-credential results on official channels."))
        add(svc(cat, jamb_common, name="JAMB Result Slip Printing", slug="jamb-result-slip-printing",
                base_price=500, price_unit="print", official_fee=0, deprince_fee=500,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False, requires_staff=False,
                description="Print your official JAMB result slip."))
        add(svc(cat, jamb_common, name="JAMB Admission Status Checking", slug="jamb-admission-status",
                base_price=1000, price_unit="check", official_fee=0, deprince_fee=1000,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False,
                description="Assistance checking admission status on JAMB CAPS."))
        add(svc(cat, jamb_common, name="JAMB CAPS Assistance", slug="jamb-caps-assistance",
                base_price=1500, price_unit="assistance", official_fee=0, deprince_fee=1500,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False, requires_staff=False,
                description="Guidance accepting / declining admission on JAMB Central Admissions Processing System (CAPS)."))
        add(svc(cat, jamb_common, name="Admission Letter Printing", slug="admission-letter-printing",
                base_price=500, price_unit="print", official_fee=0, deprince_fee=500,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False, requires_staff=False,
                description="Print your admission letter (from your admitted institution or official source only)."))
        add(svc(cat, jamb_common, name="JAMB Change of Institution/Course Assistance", slug="jamb-change-institution",
                base_price=2000, price_unit="change", official_fee=2500, deprince_fee=2000,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False,
                description="Assistance with officially available change of institution / course on the JAMB portal."))

        # ---------------- NYSC (https://www.nysc.gov.ng) ----------------
        nysc_common = dict(
            requires_file_upload=True,
            estimated_processing_time="With centre appointment",
            requires_description=True,
            requires_physical_presence=True,
            requires_biometric=True,
            requires_photograph=True,
            requires_signature=False,
            requires_appointment=True,
            requires_staff=True,
            official_provider="National Youth Service Corps (NYSC)",
            official_provider_url="https://www.nysc.gov.ng",
            verification_status="not_verified",
            requirements=[
                "Meet at the De-Prince centre for the appointment",
                "Bring your valid official documents",
                "BIOMETRIC CAPTURE REQUIRED — completed via the official/authorized NYSC process only",
            ],
            required_documents=[
                "Valid identity document",
                "Academic credentials for the batch",
                "Passport photograph (collected at biometric capture point)",
            ],
            service_instructions=(
                "Assistance with legitimate NYSC registration flow on the official portal. The "
                "platform never claims biometric capture was completed unless the authorized process "
                "actually completed it. De-Prince fees are assistance fees in addition to any official "
                "NYSC fees."
            ),
        )

        add(svc(cat, nysc_common, name="NYSC Registration Assistance", slug="nysc-registration",
                base_price=2000, price_unit="registration", official_fee=0, deprince_fee=2000,
                description="Assistance with your legitimate NYSC mobilization registration."))
        add(svc(cat, nysc_common, name="NYSC Registration Preparation", slug="nysc-registration-prep",
                base_price=1500, price_unit="package", official_fee=0, deprince_fee=1500,
                requires_physical_presence=False, requires_biometric=False,
                requires_photograph=False, requires_appointment=False, requires_staff=False,
                description="Preparation: document checklist and photo/digital requirements before registration."))
        add(svc(cat, nysc_common, name="NYSC Document Preparation", slug="nysc-document-prep",
                base_price=1500, price_unit="package", official_fee=0, deprince_fee=1500,
                requires_physical_presence=False, requires_biometric=False,
                requires_photograph=False, requires_appointment=False, requires_staff=False,
                description="Preparing, scanning and organizing the documents NYSC registration needs."))
        add(svc(cat, nysc_common, name="NYSC Call-up Letter Printing", slug="nysc-callup-printing",
                base_price=500, price_unit="print", official_fee=0, deprince_fee=500,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False, requires_staff=False,
                description="Print your official NYSC call-up letter."))
        add(svc(cat, nysc_common, name="NYSC Green Card Printing", slug="nysc-green-card-printing",
                base_price=500, price_unit="print", official_fee=0, deprince_fee=500,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False, requires_staff=False,
                description="Print your official NYSC green card."))
        add(svc(cat, nysc_common, name="NYSC Deployment-related Assistance", slug="nysc-deployment",
                base_price=2000, price_unit="assistance", official_fee=0, deprince_fee=2000,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False,
                description="Assistance understanding and managing deployment/relocation steps available officially."))
        add(svc(cat, nysc_common, name="NYSC Correction Assistance", slug="nysc-correction",
                base_price=2000, price_unit="correction", official_fee=0, deprince_fee=2000,
                requires_file_upload=False, requires_physical_presence=False,
                requires_biometric=False, requires_photograph=False,
                requires_appointment=False,
                description="Assistance with officially available NYSC data correction steps."))

        # ---------------- CAC / Business Registration (https://www.cac.gov.ng) ----------------
        cac_common = dict(
            estimated_processing_time="Subject to official processing times",
            requires_file_upload=True,
            requires_description=True,
            requires_physical_presence=False,
            requires_biometric=False,
            requires_photograph=False,
            requires_signature=True,
            requires_appointment=True,
            requires_staff=False,
            official_provider="Corporate Affairs Commission (CAC)",
            official_provider_url="https://www.cac.gov.ng",
            verification_status="not_verified",
            requirements=[
                "Provide your documents for the official process",
                "You will approve actions taken on your behalf on the official portal",
            ],
            required_documents=[
                "Means of identification",
                "Business details (name options, address, proposed business)",
            ],
            service_instructions=(
                "We assist with legitimate CAC/business registration on the official CAC platform. "
                "We do not claim accreditation unless actually obtained; where an official portal or "
                "accredited-agent process is required, our assistance is clearly distinguished from "
                "the government provider. Fees below separate the official government fee from our "
                "service fee."
            ),
        )

        add(svc(cat, cac_common, name="Business Name Registration Assistance", slug="cac-business-name",
                base_price=10000, price_unit="registration", official_fee=10000, deprince_fee=10000,
                requires_signature=False, requires_appointment=False,
                description="Assistance registering a business name with the CAC."))
        add(svc(cat, cac_common, name="Company Registration Assistance", slug="cac-company-registration",
                base_price=40000, price_unit="registration", official_fee=23700, deprince_fee=40000,
                description="Assistance incorporating a company with the CAC."))
        add(svc(cat, cac_common, name="CAC Name Search Assistance", slug="cac-name-search",
                base_price=2500, price_unit="search", official_fee=500, deprince_fee=2500,
                requires_file_upload=False, requires_appointment=False,
                requires_signature=False, requires_description=False,
                description="Assistance checking name availability on the official CAC portal."))
        add(svc(cat, cac_common, name="CAC Name Reservation Assistance", slug="cac-name-reservation",
                base_price=5000, price_unit="reservation", official_fee=2500, deprince_fee=5000,
                requires_signature=False, requires_appointment=False,
                description="Assistance reserving an approved business name with the CAC."))
        add(svc(cat, cac_common, name="CAC Documentation", slug="cac-documentation",
                base_price=15000, price_unit="package", official_fee=0, deprince_fee=15000,
                requires_signature=False, requires_appointment=False,
                description="Preparation of CAC documentation (memorandum, forms and supporting documents)."))
        add(svc(cat, cac_common, name="CAC Annual Returns Assistance", slug="cac-annual-returns",
                base_price=5000, price_unit="filing", official_fee=2500, deprince_fee=5000,
                requires_signature=False, requires_appointment=False,
                description="Assistance filing annual returns on the official CAC portal."))
        add(svc(cat, cac_common, name="Certified True Copy Assistance", slug="cac-certified-copy",
                base_price=3000, price_unit="document", official_fee=5000, deprince_fee=3000,
                requires_signature=False, requires_appointment=False,
                description="Assistance obtaining certified true copies of CAC documents."))
        add(svc(cat, cac_common, name="CAC Status Checking", slug="cac-status-checking",
                base_price=2000, price_unit="check", official_fee=0, deprince_fee=2000,
                requires_file_upload=False, requires_signature=False, requires_appointment=False,
                description="Assistance checking a company/business registration status."))
        add(svc(cat, cac_common, name="Post-registration Assistance", slug="cac-post-registration",
                base_price=15000, price_unit="package", official_fee=0, deprince_fee=15000,
                requires_signature=False, requires_appointment=False,
                description="Post-registration help: stamp duty, registration certificate coordination."))
        add(svc(cat, cac_common, name="Business Document Printing", slug="cac-business-document-printing",
                base_price=500, price_unit="print", official_fee=0, deprince_fee=500,
                requires_file_upload=False, requires_signature=False,
                requires_physical_presence=False, requires_biometric=False,
                requires_photograph=False, requires_appointment=False, requires_staff=False,
                description="Print your business registration documents and certificates."))

        await db.commit()
        print(f"Official catalogue: {added} new services (total now {len(existing)})")


if __name__ == "__main__":
    asyncio.run(seed_official())