"""Seed script: creates super admin + service catalogue."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import bcrypt
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.user import User
from app.models.profile import CustomerProfile, WorkerProfile
from app.models.finance import Wallet
from app.models.service import ServiceCategory, Service
from app.models.cybercafe import Computer, Branch
from app.models.notification import Setting
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
            db.add(Branch(name="De-Prince Digital Hub — Main Branch"))

        # Seed a few computers
        comp_count = (await db.execute(select(Computer))).scalars().all()
        if not comp_count:
            for i in range(1, 5):
                db.add(Computer(name=f"PC-{i:02d}", hourly_rate=300))

        # Service categories + services
        cat_count = (await db.execute(select(ServiceCategory))).scalars().all()
        if not cat_count:
            categories = {
                "academic": ServiceCategory(
                    name="Academic Services", slug="academic-services",
                    description="Typing, formatting, editing and document services.",
                    icon="book-open", display_order=1,
                ),
                "printing": ServiceCategory(
                    name="Printing", slug="printing",
                    description="Printing, scanning, binding and photocopying.",
                    icon="printer", display_order=2,
                ),
                "graphic-design": ServiceCategory(
                    name="Graphic Design", slug="graphic-design",
                    description="Logo, flyer, poster and brand design.",
                    icon="palette", display_order=3,
                ),
                "web-development": ServiceCategory(
                    name="Web Development", slug="web-development",
                    description="Websites, web apps and APIs.",
                    icon="code", display_order=4,
                ),
                "computer-services": ServiceCategory(
                    name="Computer Services", slug="computer-services",
                    description="Installation, troubleshooting and support.",
                    icon="monitor", display_order=5,
                ),
                "online-services": ServiceCategory(
                    name="Online Services", slug="online-services",
                    description="Authorized registrations and applications.",
                    icon="globe", display_order=6,
                ),
            }
            for cat in categories.values():
                db.add(cat)
            await db.flush()

            services = [
                # Academic
                Service(category_id=categories["academic"].id, name="Assignment Typing", slug="assignment-typing",
                        base_price=500, price_unit="page", requires_file_upload=True,
                        description="Professional typing of assignments. Format-only service to help you present your own work."),
                Service(category_id=categories["academic"].id, name="Project Typing", slug="project-typing",
                        base_price=500, price_unit="page", requires_file_upload=True,
                        description="Typing service for academic projects."),
                Service(category_id=categories["academic"].id, name="APA/Formatting", slug="apa-formatting",
                        base_price=1000, price_unit="project", requires_file_upload=True,
                        description="Correct formatting of your document per APA or other guidelines."),
                Service(category_id=categories["academic"].id, name="Table of Contents", slug="table-of-contents",
                        base_price=1500, price_unit="project", requires_file_upload=True,
                        description="Auto-generated table of contents."),
                Service(category_id=categories["academic"].id, name="PowerPoint Presentation", slug="powerpoint-presentation",
                        base_price=2000, price_unit="presentation", requires_file_upload=False,
                        description="Create a professional PowerPoint from your content."),
                Service(category_id=categories["academic"].id, name="Data Entry", slug="data-entry",
                        base_price=300, price_unit="page", requires_file_upload=True,
                        description="Accurate data entry from provided source materials."),
                # Printing
                Service(category_id=categories["printing"].id, name="Black & White Printing", slug="bw-printing",
                        base_price=50, price_unit="page", requires_file_upload=True,
                        description="Black and white printing, A4 (price per page, copies multiplied)."),
                Service(category_id=categories["printing"].id, name="Colour Printing", slug="colour-printing",
                        base_price=150, price_unit="page", requires_file_upload=True,
                        description="Colour printing (price per page, copies multiplied)."),
                Service(category_id=categories["printing"].id, name="Scanning", slug="scanning",
                        base_price=100, price_unit="page", requires_file_upload=False,
                        description="Scanning of physical documents."),
                Service(category_id=categories["printing"].id, name="Photocopying", slug="photocopying",
                        base_price=30, price_unit="page", requires_file_upload=False,
                        description="Photocopying service (price per copy)."),
                Service(category_id=categories["printing"].id, name="Binder (Spiral/Soft/Hard)", slug="binding",
                        base_price=1500, price_unit="bundle", requires_file_upload=False,
                        description="Spiral, soft or hard binding."),
                Service(category_id=categories["printing"].id, name="Lamination", slug="lamination",
                        base_price=500, price_unit="piece", requires_file_upload=False,
                        description="Document lamination."),
                Service(category_id=categories["printing"].id, name="Passport Photography", slug="passport-photography",
                        base_price=1000, price_unit="set", requires_file_upload=False,
                        description="Passport photographs."),
                # Graphic design
                Service(category_id=categories["graphic-design"].id, name="Logo Design", slug="logo-design",
                        base_price=15000, price_unit="project", requires_file_upload=False,
                        description="Professional logo design with brand identity considerations."),
                Service(category_id=categories["graphic-design"].id, name="Flyer Design", slug="flyer-design",
                        base_price=5000, price_unit="piece", requires_file_upload=True,
                        description="Eye-catching flyers."),
                Service(category_id=categories["graphic-design"].id, name="Business Card", slug="business-card",
                        base_price=5000, price_unit="design", requires_file_upload=False,
                        description="Business card design."),
                Service(category_id=categories["graphic-design"].id, name="Social Media Graphics", slug="social-media-graphics",
                        base_price=3000, price_unit="graphic", requires_file_upload=False,
                        description="Social media posts and banners."),
                Service(category_id=categories["graphic-design"].id, name="Brand Identity", slug="brand-identity",
                        base_price=50000, price_unit="package", requires_file_upload=False,
                        description="Complete brand identity package."),
                # Web development
                Service(category_id=categories["web-development"].id, name="Business Website", slug="business-website",
                        base_price=80000, price_unit="project", requires_file_upload=False,
                        description="Responsive business website."),
                Service(category_id=categories["web-development"].id, name="Landing Page", slug="landing-page",
                        base_price=30000, price_unit="project", requires_file_upload=False,
                        description="Conversion-focused landing page."),
                Service(category_id=categories["web-development"].id, name="E-commerce Website", slug="ecommerce-website",
                        base_price=150000, price_unit="project", requires_file_upload=False,
                        description="Online store with payments."),
                Service(category_id=categories["web-development"].id, name="Web Application", slug="web-application",
                        base_price=300000, price_unit="project", requires_file_upload=False,
                        description="Custom web applications."),
                Service(category_id=categories["web-development"].id, name="Website Maintenance", slug="website-maintenance",
                        base_price=15000, price_unit="month", requires_file_upload=False,
                        description="Ongoing website maintenance."),
                Service(category_id=categories["web-development"].id, name="Domain & Hosting Setup", slug="domain-hosting-setup",
                        base_price=10000, price_unit="setup", requires_file_upload=False,
                        description="Domain, hosting and SSL setup assistance."),
                # Computer services
                Service(category_id=categories["computer-services"].id, name="Windows Installation", slug="windows-installation",
                        base_price=5000, price_unit="device", requires_file_upload=False,
                        description="Windows installation with drivers."),
                Service(category_id=categories["computer-services"].id, name="Software Installation", slug="software-installation",
                        base_price=1000, price_unit="software", requires_file_upload=False,
                        description="Legitimate software installation."),
                Service(category_id=categories["computer-services"].id, name="Virus/Malware Cleanup", slug="virus-cleanup",
                        base_price=3000, price_unit="device", requires_file_upload=False,
                        description="Malware removal and system cleanup."),
                Service(category_id=categories["computer-services"].id, name="System Optimization", slug="system-optimization",
                        base_price=2000, price_unit="device", requires_file_upload=False,
                        description="Performance optimization."),
                Service(category_id=categories["computer-services"].id, name="Data Backup", slug="data-backup",
                        base_price=3000, price_unit="device", requires_file_upload=False,
                        description="Backup of your data."),
                Service(category_id=categories["computer-services"].id, name="Network Configuration", slug="network-configuration",
                        base_price=5000, price_unit="job", requires_file_upload=False,
                        description="Wi-Fi, router and network setup."),
                # Online services
                Service(category_id=categories["online-services"].id, name="School Application Assistance", slug="school-application",
                        base_price=2000, price_unit="application", requires_file_upload=True,
                        description="Help filling legitimate school applications."),
                Service(category_id=categories["online-services"].id, name="Job Application Assistance", slug="job-application",
                        base_price=2000, price_unit="application", requires_file_upload=True,
                        description="Help preparing job applications on authorized portals."),
                Service(category_id=categories["online-services"].id, name="Government Portal Assistance", slug="government-portal",
                        base_price=2000, price_unit="service", requires_file_upload=False,
                        description="Assistance with legitimate government portal transactions."),
                Service(category_id=categories["online-services"].id, name="Business Registration Assistance", slug="business-registration",
                        base_price=15000, price_unit="registration", requires_file_upload=False,
                        description="Help with legitimate business registration processes."),
            ]
            for svc in services:
                db.add(svc)

            db.add(Setting(key="business_name", value="De-Prince Digital Hub"))
            db.add(Setting(key="business_tagline", value="Everything Digital. One Platform."))
            db.add(Setting(key="currency", value="NGN"))
            db.add(Setting(key="tax_rate", value=0))
            db.add(Setting(key="commission_rate", value=20))

        # Bank catalogue (132 Nigerian commercial + microfinance banks)
        await seed_banks(db)

        await db.commit()
        print("Seeding complete")


if __name__ == "__main__":
    asyncio.run(seed())
