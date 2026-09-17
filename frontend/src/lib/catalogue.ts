import { API_URL } from "@/lib/utils";
import type { Service, ServiceCategory } from "@/types";

const FALLBACK_SERVICES: Service[] = [
  { id: "f1", category_id: "cat-academic", name: "Academic & Document Services", slug: "academic-document-services", price_type: "fixed", base_price: 500, price_unit: "page", quotation_required: false, requires_file_upload: false, requires_description: false, requires_physical_presence: false, requires_biometric: false, requires_photograph: false, requires_signature: false, requires_appointment: false, requires_staff: false, requires_worker: false, delivery_available: true, pickup_available: true, payment_required: true, commission_type: "fixed", commission_value: 0, verification_status: "not_required", is_active: true, display_order: 1, short_description: "Assignments, projects, formatting, data entry and presentation services.", category_name: "Academic Services" },
  { id: "f2", category_id: "cat-printing", name: "Printing & Binding", slug: "printing-binding", price_type: "fixed", base_price: 100, price_unit: "copy", quotation_required: false, requires_file_upload: true, requires_description: false, requires_physical_presence: false, requires_biometric: false, requires_photograph: false, requires_signature: false, requires_appointment: false, requires_staff: false, requires_worker: false, delivery_available: true, pickup_available: true, payment_required: true, commission_type: "fixed", commission_value: 0, verification_status: "not_required", is_active: true, display_order: 2, short_description: "B/W and colour printing, binding, lamination, scanning and photocopying.", category_name: "Printing" },
  { id: "f3", category_id: "cat-design", name: "Graphic Design & Branding", slug: "graphic-design-branding", price_type: "range", base_price: 5000, minimum_price: 5000, maximum_price: 150000, price_unit: "job", quotation_required: true, requires_file_upload: false, requires_description: true, requires_physical_presence: false, requires_biometric: false, requires_photograph: false, requires_signature: false, requires_appointment: false, requires_staff: false, requires_worker: false, delivery_available: true, pickup_available: true, payment_required: true, commission_type: "fixed", commission_value: 0, verification_status: "not_required", is_active: true, display_order: 3, short_description: "Logos, flyers, business cards, brand identity and social media graphics.", category_name: "Graphic Design" },
  { id: "f4", category_id: "cat-web", name: "Web Development", slug: "web-development", price_type: "range", base_price: 50000, minimum_price: 50000, maximum_price: 1500000, price_unit: "project", quotation_required: true, requires_file_upload: false, requires_description: true, requires_physical_presence: false, requires_biometric: false, requires_photograph: false, requires_signature: false, requires_appointment: false, requires_staff: false, requires_worker: false, delivery_available: true, pickup_available: true, payment_required: true, commission_type: "fixed", commission_value: 0, verification_status: "not_required", is_active: true, display_order: 4, short_description: "Business websites, e-commerce shops, web apps and brochure sites.", category_name: "Web Development" },
  { id: "f5", category_id: "cat-computer", name: "Computer Services", slug: "computer-services", price_type: "range", base_price: 2000, minimum_price: 2000, maximum_price: 30000, price_unit: "job", quotation_required: false, requires_file_upload: false, requires_description: true, requires_physical_presence: true, requires_biometric: false, requires_photograph: false, requires_signature: false, requires_appointment: false, requires_staff: false, requires_worker: false, delivery_available: true, pickup_available: true, payment_required: true, commission_type: "fixed", commission_value: 0, verification_status: "not_required", is_active: true, display_order: 5, short_description: "Software installation, repairs, virus cleanup, optimization and networking.", category_name: "Computer Services" },
  { id: "f6", category_id: "cat-online", name: "Online Services", slug: "online-services", price_type: "fixed", base_price: 2000, price_unit: "application", quotation_required: false, requires_file_upload: true, requires_description: true, requires_physical_presence: false, requires_biometric: false, requires_photograph: false, requires_signature: false, requires_appointment: false, requires_staff: false, requires_worker: false, delivery_available: true, pickup_available: true, payment_required: true, commission_type: "fixed", commission_value: 0, verification_status: "not_required", is_active: true, display_order: 6, short_description: "Online applications, registrations and government portal assistance.", category_name: "Online Services" },
];

const FALLBACK_CATEGORIES: ServiceCategory[] = [
  { id: "cat-academic", name: "Academic Services", slug: "academic-services", display_order: 1, is_active: true, description: "Typing, formatting and academic document services." },
  { id: "cat-printing", name: "Printing", slug: "printing", display_order: 2, is_active: true, description: "Print, scan, bind and photocopy." },
  { id: "cat-design", name: "Graphic Design", slug: "graphic-design", display_order: 3, is_active: true, description: "Logos, flyers, posters and brand identity." },
  { id: "cat-web", name: "Web Development", slug: "web-development", display_order: 4, is_active: true, description: "Websites, web apps and APIs." },
  { id: "cat-computer", name: "Computer Services", slug: "computer-services", display_order: 5, is_active: true, description: "Installation, troubleshooting and support." },
  { id: "cat-online", name: "Online Services", slug: "online-services", display_order: 6, is_active: true, description: "Authorized registrations and applications." },
];

export function isFallback(categories: ServiceCategory[]) {
  const ids = categories.map((c) => c.id);
  return ids.every((id) => FALLBACK_CATEGORIES.some((f) => f.id === id));
}

export async function fetchCategories(): Promise<{
  categories: ServiceCategory[];
  offline: boolean;
}> {
  try {
    const res = await fetch(`${API_URL}/services/categories`, { cache: "no-store" });
    if (!res.ok) return { categories: FALLBACK_CATEGORIES, offline: true };
    const data = (await res.json()) as ServiceCategory[];
    return { categories: data.length ? data : FALLBACK_CATEGORIES, offline: false };
  } catch {
    return { categories: FALLBACK_CATEGORIES, offline: true };
  }
}

export async function fetchServiceBySlug(
  slug: string
): Promise<{ service: Service | null; offline: boolean }> {
  try {
    const res = await fetch(`${API_URL}/services/by-slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return { service: null, offline: true };
    const service = (await res.json()) as Service;
    return { service: service?.slug ? service : null, offline: false };
  } catch {
    const fallback = FALLBACK_SERVICES.find((s) => s.slug === slug) || null;
    return { service: fallback, offline: true };
  }
}

export async function fetchCatalogue(): Promise<{
  categories: ServiceCategory[];
  services: Service[];
  offline: boolean;
}> {
  const { categories, offline } = await fetchCategories();
  try {
    const res = await fetch(`${API_URL}/services`, { cache: "no-store" });
    if (!res.ok) return { categories, services: FALLBACK_SERVICES, offline: true };
    const data = (await res.json()) as Service[];
    return { categories, services: data.length ? data : FALLBACK_SERVICES, offline };
  } catch {
    return { categories, services: FALLBACK_SERVICES, offline: true };
  }
}