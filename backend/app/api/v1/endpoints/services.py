"""Service catalogue endpoints (service engine).

Admin CRUD for services and categories so the business can create and modify
services without changing source code. Public catalogue endpoints remain
read-only to customers.
"""
import re
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.service import ServiceCategory, Service
from app.models.user import User
from app.schemas.service import (
    ServiceCategoryOut, ServiceOut, ServiceCategoryDetail, ServiceCreate,
    ServiceUpdate, ServiceCategoryBase, ServiceCategoryUpdate,
)
from app.services.audit import log_action

router = APIRouter(prefix="/services", tags=["services"])


def _slugify(value: str, fallback: str = "service") -> str:
    """Produce a URL-safe, unique-ish slug from a service name."""
    slug = value.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug or fallback


async def _slug_exists(db: AsyncSession, slug: str, exclude_id: Optional[UUID] = None) -> bool:
    query = select(Service.id).where(Service.slug == slug)
    if exclude_id:
        query = query.where(Service.id != exclude_id)
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def _unique_slug(db: AsyncSession, base: str, exclude_id: Optional[UUID] = None) -> str:
    slug = _slugify(base)
    candidate = slug
    counter = 1
    while await _slug_exists(db, candidate, exclude_id):
        candidate = f"{slug}-{counter}"
        counter += 1
    return candidate


# ---------------------------------------------------------------------------
# Public catalogue
# ---------------------------------------------------------------------------

@router.get("/categories", response_model=List[ServiceCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.is_active == True).order_by(ServiceCategory.display_order)
    )
    return result.scalars().all()


@router.get("/categories/{category_slug}", response_model=ServiceCategoryDetail)
async def get_category(category_slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.slug == category_slug)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    services = await db.execute(
        select(Service).where(Service.category_id == category.id, Service.is_active == True)
    )
    # Build the response explicitly — assigning category.services would trigger
    # lazy back-populate loads (MissingGreenlet in async sessions).
    return ServiceCategoryDetail(
        id=category.id,
        name=category.name,
        slug=category.slug,
        description=category.description,
        icon=category.icon,
        display_order=category.display_order,
        is_active=category.is_active,
        revenue_stream=category.revenue_stream,
        services=list(services.scalars().all()),
    )


@router.get("", response_model=List[ServiceOut])
async def list_services(
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    include_inactive: bool = False,
    seasonal: Optional[str] = None,  # all | year_round | seasonal
    db: AsyncSession = Depends(get_db),
):
    query = select(Service)
    if not include_inactive:
        query = query.where(Service.is_active == True)
    if category_id:
        query = query.where(Service.category_id == category_id)
    if search:
        query = query.where(Service.name.ilike(f"%{search}%"))
    if seasonal == "year_round":
        query = query.where(Service.is_seasonal == False)
    elif seasonal == "seasonal":
        query = query.where(Service.is_seasonal == True)
    query = query.order_by(Service.display_order, Service.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/by-slug/{service_slug}", response_model=ServiceOut)
async def get_service_by_slug(service_slug: str, db: AsyncSession = Depends(get_db)):
    """Public lookup by slug - used by SEO-friendly /services/{slug} pages."""
    result = await db.execute(select(Service).where(Service.slug == service_slug))
    service = result.scalar_one_or_none()
    if not service or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.get("/{service_id}", response_model=ServiceOut)
async def get_service(service_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


# ---------------------------------------------------------------------------
# Admin management
# ---------------------------------------------------------------------------

@router.post("", response_model=ServiceOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_service(
    data: ServiceCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = await db.execute(select(ServiceCategory).where(ServiceCategory.id == data.category_id))
    if not category.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid category")

    slug = await _unique_slug(db, data.name)
    values = data.model_dump(exclude={"slug"})
    values["slug"] = slug
    service = Service(**values)
    db.add(service)
    await log_action(db, "service_created", current_user.id, "services", service.id, new_values=data.model_dump())
    await db.commit()
    await db.refresh(service)
    return service


@router.patch("/{service_id}", response_model=ServiceOut, dependencies=[Depends(require_admin)])
async def update_service(
    service_id: UUID,
    data: ServiceUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    old = {c.name: getattr(service, c.name) for c in service.__table__.columns}
    updates = data.model_dump(exclude_unset=True)

    if "category_id" in updates:
        category = await db.execute(select(ServiceCategory).where(ServiceCategory.id == updates["category_id"]))
        if not category.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid category")

    if "name" in updates and updates["name"] and updates["name"] != service.name:
        service.slug = await _unique_slug(db, updates["name"], exclude_id=service.id)

    for field, value in updates.items():
        if field == "name":
            service.name = value
        else:
            setattr(service, field, value)

    await log_action(db, "service_updated", current_user.id, "services", service.id, old_values=old, new_values=updates)
    await db.commit()
    await db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_service(
    service_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    await log_action(db, "service_deleted", current_user.id, "services", service.id, new_values={"name": service.name})
    await db.delete(service)
    await db.commit()
    return None


# ---------------------------------------------------------------------------
# Category management
# ---------------------------------------------------------------------------

@router.post("/categories", response_model=ServiceCategoryOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_category(
    payload: ServiceCategoryBase,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    slug = await _unique_slug(db, payload.name)
    existing = await db.execute(select(ServiceCategory).where(ServiceCategory.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Category slug already exists")
    category = ServiceCategory(
        name=payload.name,
        slug=slug,
        description=payload.description,
        icon=payload.icon,
        display_order=payload.display_order,
        is_active=payload.is_active,
        revenue_stream=payload.revenue_stream,
    )
    db.add(category)
    await log_action(db, "category_created", current_user.id, "service_categories", category.id, new_values=payload.model_dump())
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=ServiceCategoryOut, dependencies=[Depends(require_admin)])
async def update_category(
    category_id: UUID,
    payload: ServiceCategoryUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ServiceCategory).where(ServiceCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    old = {c.name: getattr(category, c.name) for c in category.__table__.columns}
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "name" and value and value != category.name:
            category.name = value
            category.slug = await _unique_slug(db, value, exclude_id=category.id)
        else:
            setattr(category, field, value)
    await log_action(db, "category_updated", current_user.id, "service_categories", category.id, old_values=old, new_values=updates)
    await db.commit()
    await db.refresh(category)
    return category
