"""Seed script: creates super admin + service catalogue (idempotent)."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import bcrypt
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.models.user import User
from app.models.profile import CustomerProfile, WorkerProfile
from app.models.finance import Wallet
from app.models.service import ServiceCategory, Service
from app.models.cybercafe import Computer, Branch
from app.models.notification import Setting
from app.models.verification import VerificationRequest, VerificationProviderConfig
from app.services.banks import seed_banks
from app.models.enums import UserRole


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def seed():
    async with SessionLocal() as db:
        # Super admin
        existing = await db.execute(select(User).where(User.email == "admin@deprince.com"))
        if not existing.scalar_one_or_none():
            admin = User(
                email="admin@deprince.com",
                first_name="De-Prince",
                last_name="Admin",
                password_hash=hash_password("admin123"),
                role=UserRole.SUPER_ADMIN,
                is_verified=True,
            )
            db.add(admin)
            await db.flush()
            db.add(Wallet(user_id=admin.id))

        # Branch
        branch_count = (await db.execute(select(Branch))).scalars().all()
        if not branch_count:
            db.add(Branch(name="De-Prince Digital Hub - Main Branch"))

        # Seed a few computers
        comp_count = (await db.execute(select(Computer))).scalars().all()
        if not comp_count:
            for i in range(1, 5):
                db.add(Computer(name=f"PC-{i:02d}", hourly_rate=300))
        await db.flush()

        # ── Ensure verification tables exist (idempotent DDL) ────────────
        # This is needed because we cannot run alembic against Render's
        # database directly; the migration file exists for documentation.
        # NOTE: each statement is executed separately — asyncpg rejects
        # multiple commands inside a single execute() call.
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS verification_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reference VARCHAR(50) UNIQUE NOT NULL,
                customer_id UUID NOT NULL REFERENCES users(id),
                order_id UUID REFERENCES orders(id),
                verification_type VARCHAR(50) NOT NULL,
                entity_name VARCHAR(300),
                id_number VARCHAR(100),
                id_number_encrypted VARCHAR(500),
                file_id UUID REFERENCES files(id),
                status VARCHAR(30) NOT NULL DEFAULT 'submitted',
                status_message TEXT,
                provider VARCHAR(100),
                provider_reference VARCHAR(200),
                result JSON,
                service_id UUID REFERENCES services(id),
                amount FLOAT DEFAULT 0,
                is_paid BOOLEAN NOT NULL DEFAULT FALSE,
                requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at TIMESTAMPTZ,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ
            )
        """))
        await db.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_verification_requests_reference "
            "ON verification_requests(reference)"
        ))
        await db.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_verification_requests_customer_id "
            "ON verification_requests(customer_id)"
        ))
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS verification_providers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(200) NOT NULL,
                provider_class VARCHAR(200) NOT NULL,
                supports_types JSON DEFAULT '[]',
                is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                requires_secret BOOLEAN NOT NULL DEFAULT TRUE,
                base_url VARCHAR(500),
                docs_url VARCHAR(500),
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await db.flush()

        # ── Service categories (idempotent upsert) ──────────────────────
        category_defs = [
            ServiceCategory(name="Academic Services", slug="academic-services",
                            description="Typing, formatting, editing and document services.",
                            icon="book-open", display_order=1),
            ServiceCategory(name="Printing", slug="printing",
                            description="Printing, scanning, binding and photocopying.",
                            icon="printer", display_order=2),
            ServiceCategory(name="Graphic Design", slug="graphic-design",
                            description="Logo, flyer, poster and brand design.",
                            icon="palette", display_order=3),
            ServiceCategory(name="Web Development", slug="web-development",
                            description="Websites, web apps and APIs.",
                            icon="code", display_order=4),
            ServiceCategory(name="Computer Services", slug="computer-services",
                            description="Installation, troubleshooting and support.",
                            icon="monitor", display_order=5),
            ServiceCategory(name="Online Services", slug="online-services",
                            description="Authorized registrations and applications.",
                            icon="globe", display_order=6),
            ServiceCategory(name="JAMB Services", slug="jamb-services",
                            description="UTME registration, exam preparation and post-UTME services.",
                            icon="graduation-cap", display_order=7),
            ServiceCategory(name="Government & Identity", slug="government-services",
                            description="NIN, BVN, CAC and official document processing.",
                            icon="landmark", display_order=8),
        ]

        cats: dict[str, ServiceCategory] = {}
        for catdef in category_defs:
            existing = await db.execute(
                select(ServiceCategory).where(ServiceCategory.slug == catdef.slug)
            )
            row = existing.scalar_one_or_none()
            if row:
                cats[catdef.slug] = row
            else:
                db.add(catdef)
                await db.flush()
                cats[catdef.slug] = catdef
        await db.flush()

        # ── Services (idempotent upsert by slug) ────────────────────────
        services = [
            # ── Academic ───────────────────────────────────────────────
            Service(category_id=cats["academic-services"].id,
                    name="Assignment Typing", slug="assignment-typing",
                    base_price=500, price_unit="page", requires_file_upload=True,
                    description="Professional typing of assignments. Format-only service to help you present your own work."),
            Service(category_id=cats["academic-services"].id,
                    name="Project Typing", slug="project-typing",
                    base_price=500, price_unit="page", requires_file_upload=True,
                    description="Typing service for academic projects."),
            Service(category_id=cats["academic-services"].id,
                    name="APA/Formatting", slug="apa-formatting",
                    base_price=1000, price_unit="project", requires_file_upload=True,
                    description="Correct formatting of your document per APA or other guidelines."),
            Service(category_id=cats["academic-services"].id,
                    name="Table of Contents", slug="table-of-contents",
                    base_price=1500, price_unit="project", requires_file_upload=True,
                    description="Auto-generated table of contents."),
            Service(category_id=cats["academic-services"].id,
                    name="PowerPoint Presentation", slug="powerpoint-presentation",
                    base_price=2000, price_unit="presentation", requires_file_upload=False,
                    description="Create a professional PowerPoint from your content."),
            Service(category_id=cats["academic-services"].id,
                    name="Data Entry", slug="data-entry",
                    base_price=300, price_unit="page", requires_file_upload=True,
                    description="Accurate data entry from provided source materials."),
            # ── Printing ───────────────────────────────────────────────
            Service(category_id=cats["printing"].id,
                    name="Black & White Printing", slug="bw-printing",
                    base_price=50, price_unit="page", requires_file_upload=True,
                    description="Black and white printing, A4 (price per page, copies multiplied)."),
            Service(category_id=cats["printing"].id,
                    name="Colour Printing", slug="colour-printing",
                    base_price=150, price_unit="page", requires_file_upload=True,
                    description="Colour printing (price per page, copies multiplied)."),
            Service(category_id=cats["printing"].id,
                    name="Scanning", slug="scanning",
                    base_price=100, price_unit="page", requires_file_upload=False,
                    description="Scanning of physical documents."),
            Service(category_id=cats["printing"].id,
                    name="Photocopying", slug="photocopying",
                    base_price=30, price_unit="page", requires_file_upload=False,
                    description="Photocopying service (price per copy)."),
            Service(category_id=cats["printing"].id,
                    name="Binder (Spiral/Soft/Hard)", slug="binding",
                    base_price=1500, price_unit="bundle", requires_file_upload=False,
                    description="Spiral, soft or hard binding."),
            Service(category_id=cats["printing"].id,
                    name="Lamination", slug="lamination",
                    base_price=500, price_unit="piece", requires_file_upload=False,
                    description="Document lamination."),
            Service(category_id=cats["printing"].id,
                    name="Passport Photography", slug="passport-photography",
                    base_price=1000, price_unit="set", requires_file_upload=False,
                    description="Passport photographs."),
            # ── Graphic design ─────────────────────────────────────────
            Service(category_id=cats["graphic-design"].id,
                    name="Logo Design", slug="logo-design",
                    base_price=15000, price_unit="project", requires_file_upload=False,
                    description="Professional logo design with brand identity considerations."),
            Service(category_id=cats["graphic-design"].id,
                    name="Flyer Design", slug="flyer-design",
                    base_price=5000, price_unit="piece", requires_file_upload=True,
                    description="Eye-catching flyers."),
            Service(category_id=cats["graphic-design"].id,
                    name="Business Card", slug="business-card",
                    base_price=5000, price_unit="design", requires_file_upload=False,
                    description="Business card design."),
            Service(category_id=cats["graphic-design"].id,
                    name="Social Media Graphics", slug="social-media-graphics",
                    base_price=3000, price_unit="graphic", requires_file_upload=False,
                    description="Social media posts and banners."),
            Service(category_id=cats["graphic-design"].id,
                    name="Brand Identity", slug="brand-identity",
                    base_price=50000, price_unit="package", requires_file_upload=False,
                    description="Complete brand identity package."),
            # ── Web development ────────────────────────────────────────
            Service(category_id=cats["web-development"].id,
                    name="Business Website", slug="business-website",
                    base_price=80000, price_unit="project", requires_file_upload=False,
                    description="Responsive business website."),
            Service(category_id=cats["web-development"].id,
                    name="Landing Page", slug="landing-page",
                    base_price=30000, price_unit="project", requires_file_upload=False,
                    description="Conversion-focused landing page."),
            Service(category_id=cats["web-development"].id,
                    name="E-commerce Website", slug="ecommerce-website",
                    base_price=150000, price_unit="project", requires_file_upload=False,
                    description="Online store with payments."),
            Service(category_id=cats["web-development"].id,
                    name="Web Application", slug="web-application",
                    base_price=300000, price_unit="project", requires_file_upload=False,
                    description="Custom web applications."),
            Service(category_id=cats["web-development"].id,
                    name="Website Maintenance", slug="website-maintenance",
                    base_price=15000, price_unit="month", requires_file_upload=False,
                    description="Ongoing website maintenance."),
            Service(category_id=cats["web-development"].id,
                    name="Domain & Hosting Setup", slug="domain-hosting-setup",
                    base_price=10000, price_unit="setup", requires_file_upload=False,
                    description="Domain, hosting and SSL setup assistance."),
            # ── Computer services ──────────────────────────────────────
            Service(category_id=cats["computer-services"].id,
                    name="Windows Installation", slug="windows-installation",
                    base_price=5000, price_unit="device", requires_file_upload=False,
                    description="Windows installation with drivers."),
            Service(category_id=cats["computer-services"].id,
                    name="Software Installation", slug="software-installation",
                    base_price=1000, price_unit="software", requires_file_upload=False,
                    description="Legitimate software installation."),
            Service(category_id=cats["computer-services"].id,
                    name="Virus/Malware Cleanup", slug="virus-cleanup",
                    base_price=3000, price_unit="device", requires_file_upload=False,
                    description="Malware removal and system cleanup."),
            Service(category_id=cats["computer-services"].id,
                    name="System Optimization", slug="system-optimization",
                    base_price=2000, price_unit="device", requires_file_upload=False,
                    description="Performance optimization."),
            Service(category_id=cats["computer-services"].id,
                    name="Data Backup", slug="data-backup",
                    base_price=3000, price_unit="device", requires_file_upload=False,
                    description="Backup of your data."),
            Service(category_id=cats["computer-services"].id,
                    name="Network Configuration", slug="network-configuration",
                    base_price=5000, price_unit="job", requires_file_upload=False,
                    description="Wi-Fi, router and network setup."),
            # ── Online services ────────────────────────────────────────
            Service(category_id=cats["online-services"].id,
                    name="School Application Assistance", slug="school-application",
                    base_price=2000, price_unit="application", requires_file_upload=True,
                    description="Help filling legitimate school applications."),
            Service(category_id=cats["online-services"].id,
                    name="Job Application Assistance", slug="job-application",
                    base_price=2000, price_unit="application", requires_file_upload=True,
                    description="Help preparing job applications on authorized portals."),
            Service(category_id=cats["online-services"].id,
                    name="Government Portal Assistance", slug="government-portal",
                    base_price=2000, price_unit="service", requires_file_upload=False,
                    description="Assistance with legitimate government portal transactions."),
            Service(category_id=cats["online-services"].id,
                    name="Business Registration Assistance", slug="business-registration",
                    base_price=15000, price_unit="registration", requires_file_upload=False,
                    description="Help with legitimate business registration processes."),
            # ── JAMB services ──────────────────────────────────────────
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB/UTME Registration", slug="jamb-utme-registration",
                    base_price=5000, price_unit="registration", requires_file_upload=False,
                    requires_physical_presence=True, requires_biometric=True,
                    requires_photograph=True, requires_signature=True,
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    price_type="quote",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    official_fee=7700, deprince_fee=5000,
                    short_description="Authorized JAMB/UTME registration with biometric capture and profile creation.",
                    description="Register for JAMB/UTME through our authorized process. We handle your JAMB profile creation, email capture, and ePIN generation. Biometric capture and passport photograph required at our centre. Official JAMB fee plus our service fee applies."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB Profile Creation", slug="jamb-profile-creation",
                    base_price=1000, price_unit="profile", requires_file_upload=False,
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    short_description="Create and set up your JAMB profile with a valid email address.",
                    description="We create your JAMB profile (your email and phone number) and confirm it on the JAMB portal so you can proceed with registration."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB ePIN & Document Printing", slug="jamb-epin-printing",
                    base_price=500, price_unit="service", requires_file_upload=False,
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    short_description="JAMB SLA ePIN purchase, fee details and printing of JAMB documents.",
                    description="Purchase and print your JAMB documents including confirmation of CBT centre and registration slips."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB Correction of Data", slug="jamb-correction",
                    base_price=2000, price_unit="correction", requires_file_upload=False,
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    short_description="Correction of JAMB registration data (name, date of birth, centre, etc.).",
                    description="Assistance with legitimate corrections of your JAMB registration data. Official JAMB correction fees may apply."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB CBT Practice", slug="jamb-cbt-practice",
                    base_price=1500, price_unit="session", requires_file_upload=False,
                    requires_physical_presence=True,
                    short_description="Guided CBT practice sessions on past questions.",
                    description="Practice sessions on JAMB past questions with guidance at our centre."),
            Service(category_id=cats["jamb-services"].id,
                    name="Post-UTME Registration", slug="post-utme-registration",
                    base_price=2000, price_unit="registration", requires_file_upload=False,
                    short_description="Assistance with post-UTME registration on institution portals.",
                    description="Help completing legitimate post-UTME screening registration on authorized institution portals."),
            # ── Government & Identity services ─────────────────────────
            Service(category_id=cats["government-services"].id,
                    name="NIN (National ID) Registration", slug="nin-registration",
                    base_price=2000, price_unit="booking", requires_file_upload=False,
                    requires_physical_presence=True, requires_biometric=True, requires_photograph=True,
                    official_provider="National Identity Management Commission (NIMC)",
                    official_provider_url="https://nimc.gov.ng",
                    official_fee=0, deprince_fee=2000, price_type="quote",
                    short_description="NIN registration booking and appointment with NIMC (biometric at NIMC office).",
                    description="We help you book and prepare for your NIN (National Identification Number) registration at NIMC. First NIN registration is free at NIMC; our booking and assistance service fee is separate."),
            Service(category_id=cats["government-services"].id,
                    name="NIN Retrieval / Print", slug="nin-retrieval-print",
                    base_price=500, price_unit="service", requires_file_upload=False,
                    short_description="Retrieve and print your NIN slip.",
                    description="Retrieval and printing of your NIN slip from the NIMC portal."),
            Service(category_id=cats["government-services"].id,
                    name="BVN (Bank Verification Number)", slug="bvn-registration",
                    base_price=1500, price_unit="service", requires_file_upload=False,
                    requires_physical_presence=True, requires_biometric=True,
                    official_provider="Nigeria Inter-Bank Settlement System (NIBSS)",
                    official_provider_url="https://nibss-plc.com.ng",
                    short_description="BVN enrolment guidance and appointment booking.",
                    description="Guidance and appointment booking for BVN enrolment. BVN enrolment is done at your bank; we help you prepare and book."),
            Service(category_id=cats["government-services"].id,
                    name="CAC Business Registration", slug="cac-business-registration",
                    base_price=20000, price_unit="registration", requires_file_upload=False,
                    official_provider="Corporate Affairs Commission (CAC)",
                    official_provider_url="https://www.cac.gov.ng",
                    official_fee=20000, deprince_fee=20000, price_type="quote", requires_signature=True,
                    short_description="Business name, LLC or BN registration with CAC.",
                    description="End-to-end CAC registration including business name reservation, incorporation, and certificate download."),
            Service(category_id=cats["government-services"].id,
                    name="CAC Business Search", slug="cac-business-search",
                    base_price=1000, price_unit="search", requires_file_upload=False,
                    official_provider="Corporate Affairs Commission (CAC)",
                    official_provider_url="https://www.cac.gov.ng",
                    short_description="Search for a registered business on the CAC portal.",
                    description="Verify a business name on the CAC registry."),
            Service(category_id=cats["government-services"].id,
                    name="Voter Registration Booking", slug="voter-registration",
                    base_price=1000, price_unit="booking", requires_file_upload=False,
                    requires_physical_presence=True, requires_biometric=True,
                    official_provider="Independent National Electoral Commission (INEC)",
                    official_provider_url="https://www.inecnigeria.org",
                    short_description="Continuous voter registration (CVR) booking.",
                    description="Assistance booking and preparing for continuous voter registration at your INEC centre."),
            Service(category_id=cats["government-services"].id,
                    name="Verification Centre", slug="verification-centre",
                    base_price=1000, price_unit="verification", requires_file_upload=True,
                    short_description="NIN, BVN, document and academic verification reports.",
                    description="Request a verification report (NIN, BVN, CAC, academic documents). We connect you with our verification desk; results are delivered as reports with reference numbers."),
            Service(category_id=cats["government-services"].id,
                    name="NYSC Registration Assistance", slug="nysc-registration",
                    base_price=3000, price_unit="registration", requires_file_upload=True,
                    is_seasonal=True, season_label="NYSC season",
                    official_provider="National Youth Service Corps (NYSC)",
                    official_provider_url="https://portal.nysc.org.ng",
                    short_description="Assistance with NYSC mobilization registration on the official portal.",
                    description="Guidance completing your NYSC registration and data processing on the official portal."),
            Service(category_id=cats["government-services"].id,
                    name="Document Attestation", slug="document-attestation",
                    base_price=1500, price_unit="document", requires_file_upload=False,
                    requires_physical_presence=True,
                    short_description="Notarization/attestation of documents.",
                    description="Attestation and notarization of educational, business and personal documents."),
            Service(category_id=cats["government-services"].id,
                    name="Passport Booking Assistance", slug="passport-booking",
                    base_price=2500, price_unit="booking", requires_file_upload=False,
                    requires_physical_presence=True, requires_biometric=True,
                    official_provider="Nigeria Immigration Service (NIS)",
                    official_provider_url="https://passport.immigration.gov.ng",
                    short_description="Booking assistance for Nigerian passport appointments.",
                    description="Help booking and preparing for your international passport appointment on the Immigration portal."),
            # ── NIN / verification centre services (pricing manageable by admin) ──
            Service(category_id=cats["government-services"].id,
                    name="NIN Search", slug="nin-search",
                    base_price=150, price_unit="search", price_type="fixed",
                    official_provider="National Identity Management Commission (NIMC)",
                    official_provider_url="https://nimc.gov.ng",
                    short_description="Verify a NIN against NIMC records.",
                    description="We check a National Identification Number against official NIMC records and report whether the record exists."),
            Service(category_id=cats["government-services"].id,
                    name="NIN Search V1", slug="nin-search-v1",
                    base_price=150, price_unit="search", price_type="fixed",
                    official_provider="National Identity Management Commission (NIMC)",
                    official_provider_url="https://nimc.gov.ng",
                    short_description="NIN verification against NIMC records (V1 channel).",
                    description="Verify a National Identification Number via our V1 verification channel."),
            Service(category_id=cats["government-services"].id,
                    name="NIN Verification V3", slug="nin-verification-v3",
                    base_price=150, price_unit="verification", price_type="fixed",
                    official_provider="National Identity Management Commission (NIMC)",
                    official_provider_url="https://nimc.gov.ng",
                    short_description="Full NIN verification (V3 channel).",
                    description="Complete NIN verification of a National Identification Number with detailed record confirmation."),
            Service(category_id=cats["government-services"].id,
                    name="NIN Search V4", slug="nin-search-v4",
                    base_price=150, price_unit="search", price_type="fixed",
                    official_provider="National Identity Management Commission (NIMC)",
                    official_provider_url="https://nimc.gov.ng",
                    short_description="NIN verification against NIMC records (V4 channel).",
                    description="Verify a National Identification Number via our V4 verification channel."),
            Service(category_id=cats["government-services"].id,
                    name="NIN Demography Search V1", slug="nin-demography-search-v1",
                    base_price=150, price_unit="search", price_type="fixed", bookable=False,
                    is_active=True,
                    price_notice="Service Not Available",
                    official_provider="National Identity Management Commission (NIMC)",
                    official_provider_url="https://nimc.gov.ng",
                    short_description="Demographic NIN search (V1 channel).",
                    description="Demographic search service for NIN records. This service is currently not available for payment."),
            Service(category_id=cats["government-services"].id,
                    name="Phone Number Search", slug="phone-number-search",
                    base_price=150, price_unit="search", price_type="fixed",
                    short_description="Search a phone number against official records.",
                    description="We check a phone number against available official records and report the result."),
            Service(category_id=cats["government-services"].id,
                    name="Phone Number Search V3", slug="phone-number-search-v3",
                    base_price=150, price_unit="search", price_type="fixed",
                    short_description="Phone number lookup (V3 channel).",
                    description="Phone number lookup via our V3 verification channel."),
            Service(category_id=cats["government-services"].id,
                    name="Phone Number Search V4", slug="phone-number-search-v4",
                    base_price=150, price_unit="search", price_type="fixed",
                    short_description="Phone number lookup (V4 channel).",
                    description="Phone number lookup via our V4 verification channel."),
            Service(category_id=cats["government-services"].id,
                    name="NIN Verification", slug="nin-verification",
                    base_price=150, price_unit="verification", price_type="conditional",
                    no_record_price=50,
                    price_notice="This service costs ₦150 if a record is found, and ₦50 if no record is found.",
                    official_provider="National Identity Management Commission (NIMC)",
                    official_provider_url="https://nimc.gov.ng",
                    short_description="NIN verification with conditional pricing based on the result.",
                    description="Verify a National Identification Number. This service costs ₦150 if a record is found, and ₦50 if no record is found. The charge is calculated from the actual verification result."),
            Service(category_id=cats["government-services"].id,
                    name="BVN Search", slug="bvn-search",
                    base_price=150, price_unit="search", price_type="fixed",
                    official_provider="Nigeria Inter-Bank Settlement System (NIBSS)",
                    official_provider_url="https://nibss-plc.com.ng",
                    short_description="BVN verification against NIBSS records.",
                    description="Verify a Bank Verification Number against official NIBSS records."),
            Service(category_id=cats["government-services"].id,
                    name="BVN V2 Search", slug="bvn-v2-search",
                    base_price=150, price_unit="search", price_type="fixed",
                    official_provider="Nigeria Inter-Bank Settlement System (NIBSS)",
                    official_provider_url="https://nibss-plc.com.ng",
                    short_description="BVN verification against NIBSS records (V2 channel).",
                    description="Verify a Bank Verification Number via our V2 verification channel."),
            Service(category_id=cats["government-services"].id,
                    name="Phone Verification V1", slug="phone-verification-v1",
                    base_price=150, price_unit="verification", price_type="fixed",
                    price_notice="This service costs ₦150. The price is configurable from the admin panel.",
                    short_description="Phone number verification (V1 channel).",
                    description="Phone number verification via our V1 channel. Price is configurable by the admin from the pricing panel."),
            # ── JAMB reprint / print-out services ──────────────────────────
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB Original Result Slip Print Out", slug="jamb-original-result-slip-printout",
                    base_price=2200, price_unit="service", price_type="fixed",
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    price_notice="This Service will cost you (₦2,200)",
                    short_description="Print out of your JAMB original result slip.",
                    description="We print your JAMB original result slip. This Service will cost you (₦2,200)."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB 2026 Exam Slip Printing", slug="jamb-2026-exam-slip-printing",
                    base_price=500, price_unit="service", price_type="fixed",
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    price_notice="This Service will cost you (₦500)",
                    short_description="Printing of your JAMB 2026 exam slip.",
                    description="We print your JAMB 2026 exam slip. This Service will cost you (₦500)."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB Admission Letter Print Out", slug="jamb-admission-letter-printout",
                    base_price=2000, price_unit="service", price_type="fixed",
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    price_notice="This Service will cost you (₦2,000)",
                    short_description="Print out of your JAMB admission letter.",
                    description="We print your JAMB admission letter. This Service will cost you (₦2,000)."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB Re-Prints / Other JAMB Services", slug="jamb-reprints-other",
                    base_price=500, price_unit="service", price_type="fixed",
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    price_notice="This Service will cost you (₦500)",
                    short_description="Re-prints and other JAMB document services.",
                    description="Other JAMB printing and re-print services. This Service will cost you (₦500)."),
            Service(category_id=cats["jamb-services"].id,
                    name="JAMB Reprint Original Result Slip", slug="jamb-reprint-original-result-slip",
                    base_price=500, price_unit="service", price_type="fixed",
                    is_seasonal=True, season_label="JAMB/UTME season (Jan-May)",
                    official_provider="Joint Admissions and Matriculation Board (JAMB)",
                    official_provider_url="https://www.jamb.gov.ng",
                    price_notice="This Service will cost you (₦500)",
                    short_description="Re-print of your JAMB original result slip.",
                    description="We re-print your JAMB original result slip. This Service will cost you (₦500)."),
        ]

        for svc in services:
            existing = await db.execute(
                select(Service).where(Service.slug == svc.slug)
            )
            if existing.scalar_one_or_none():
                continue
            db.add(svc)

        # ── Price normalization: force quote-only services ───────────────
        # Services whose prices have NOT been confirmed must not show invented
        # prices. They are presented as "Request a Quote" on the storefront.
        QUOTE_CATEGORY_SLUGS = {
            "academic-services",
            "printing",
            "graphic-design",
            "web-development",
            "computer-services",
        }
        QUOTE_SERVICE_SLUGS = {
            "cac-business-registration",
            "cac-business-search",
            "business-registration",
            "government-portal",
        }
        for cat_slug in QUOTE_CATEGORY_SLUGS:
            cat = cats.get(cat_slug)
            if cat is None:
                continue
            await db.execute(
                update(Service)
                .where(Service.category_id == cat.id)
                .values(price_type="quote", quotation_required=True)
            )
        await db.execute(
            update(Service)
            .where(Service.slug.in_(QUOTE_SERVICE_SLUGS))
            .values(price_type="quote", quotation_required=True)
        )
        await db.flush()

        # Settings (idempotent)
        settings_data = [
            ("business_name", "De-Prince Digital Hub"),
            ("business_tagline", "Everything Digital. One Platform."),
            ("currency", "NGN"),
            ("tax_rate", "0"),
            ("commission_rate", "20"),
        ]
        for key, value in settings_data:
            existing = await db.execute(select(Setting).where(Setting.key == key))
            if not existing.scalar_one_or_none():
                db.add(Setting(key=key, value=value))

        # Bank catalogue (132 Nigerian commercial + microfinance banks)
        await seed_banks(db)

        await db.commit()
        print("Seeding complete")


if __name__ == "__main__":
    asyncio.run(seed())
