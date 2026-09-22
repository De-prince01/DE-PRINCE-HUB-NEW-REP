import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Printer,
  Palette,
  Code,
  Monitor,
  Globe,
  Landmark,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileUp,
  Type,
} from "lucide-react";
import { API_URL, formatNaira } from "@/lib/utils";
import { toSentenceCase } from "@/lib/sentence";
import { resolveServiceIcon } from "@/lib/service-icons";
import { fetchServiceBySlug } from "@/lib/catalogue";
import SectionHeading from "@/components/marketing/section-heading";
import type { Service, ServiceCategory } from "@/types";
import Image from "next/image";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "academic": GraduationCap,
  "printing": Printer,
  "graphic design": Palette,
  "web development": Code,
  "computer services": Monitor,
  "online services": Globe,
  "government & identity": Landmark,
  "government": Landmark,
  "jamb services": GraduationCap,
};

type CategoryPageData = {
  category: ServiceCategory;
  services: Service[];
  offline: boolean;
};

async function fetchCategory(slug: string): Promise<CategoryPageData | null> {
  try {
    const res = await fetch(
      `${API_URL}/services/categories/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      icon?: string | null;
      display_order: number;
      is_active: boolean;
      services: Service[];
    };
    return {
      category: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        icon: data.icon ?? null,
        display_order: data.display_order,
        is_active: data.is_active,
      },
      services: data.services || [],
      offline: false,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const data = await fetchCategory(params.category);
  if (data) {
    const title = `${toSentenceCase(data.category.name)} Services | DE-PRINCE DIGITAL HUB`;
    return {
      title,
      description:
        data.category.description ||
        `Browse ${data.category.name} services at DE-PRINCE DIGITAL HUB with transparent Naira pricing.`,
      openGraph: {
        title,
        type: "website",
        url: `/services/${data.category.slug}`,
        siteName: "DE-PRINCE DIGITAL HUB",
      },
    };
  }
  const { service } = await fetchServiceBySlug(params.category);
  if (service) {
    const title = `${toSentenceCase(service.name)} | DE-PRINCE DIGITAL HUB`;
    return {
      title,
      description:
        service.short_description ||
        service.description ||
        `${service.name} at DE-PRINCE DIGITAL HUB with transparent Naira pricing.`,
      openGraph: {
        title,
        type: "website",
        url: `/services/${service.slug}`,
        siteName: "DE-PRINCE DIGITAL HUB",
      },
    };
  }
  return { title: "Service not found | DE-PRINCE DIGITAL HUB" };
}

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const data = await fetchCategory(params.category);
  if (data) {
    const { category, services, offline } = data;
    const Icon = CATEGORY_ICONS[category.name.toLowerCase()] || BookOpen;
    const active = services.filter((s) => s.is_active) as Service[];
    return (
      <CategoryView
        category={category}
        active={active}
        offline={offline}
        name={category.name}
        slug={category.slug}
        description={
          category.description ||
          `Professional ${category.name.toLowerCase()} services with transparent Naira pricing, online ordering and nationwide delivery.`
        }
      />
    );
  }

  const { service } = await fetchServiceBySlug(params.category);
  if (service) return <SingleServiceView service={service} />;
  notFound();
}

function CategoryView({
  category,
  active,
  offline,
  name,
  slug,
  description,
}: {
  category: ServiceCategory;
  active: Service[];
  offline: boolean;
  name: string;
  slug: string;
  description: string;
}) {
  const Icon = CATEGORY_ICONS[category.name.toLowerCase()] || BookOpen;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${name} Services`,
    description: description,
    provider: { "@type": "LocalBusiness", name: "DE-PRINCE DIGITAL HUB" },
    category: name,
    areaServed: "NG",
  };

  return (
    <div className="container section-pad">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-dim">
        <Link href="/" className="hover:text-gold">Home</Link>
        <span>/</span>
        <Link href="/services" className="hover:text-gold">Services</Link>
        <span>/</span>
        <span className="text-gold">{name}</span>
      </nav>

      <section className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15">
              <Icon className="h-6 w-6 text-gold-bright" />
            </span>
            <div>
              <p className="eyebrow">DE-PRINCE Catalogue</p>
              <h1 className="section-title mt-1">{toSentenceCase(name)} Services</h1>
            </div>
          </div>
          <p className="mt-4 text-base leading-relaxed text-text-muted">{description}</p>
        </div>
        {!offline && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-bright">
            {active.length} service{active.length === 1 ? "" : "s"} available
          </span>
        )}
      </section>

      {/* vertical service cards */}
      <section className="mt-10 space-y-4">
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gold/30 p-12 text-center text-text-dim">
            <p className="font-semibold text-white">No active services in this category yet.</p>
            <p className="mt-2 text-sm">Check back soon or browse the full catalogue.</p>
            <Link href="/services" className="btn-gold mt-6">Browse all services</Link>
          </div>
        ) : (
          active.map((service) => (
            <VerticalServiceCard key={service.id} service={service} />
          ))
        )}
      </section>

      <div className="mt-14 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-8 text-center sm:p-10">
        <SectionHeading
          eyebrow="Still deciding?"
          title="Let our team guide you"
          subtitle="Describe what you need and we'll recommend the right service and price."
          center
        />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn-gold">Contact us</Link>
          <Link href="/faq" className="btn-ghost-gold">Read the FAQ</Link>
        </div>
      </div>
    </div>
  );
}

function SingleServiceView({ service }: { service: Service }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.short_description || service.description || undefined,
    isSimilarTo: [],
    provider: { "@type": "LocalBusiness", name: "DE-PRINCE DIGITAL HUB" },
    areaServed: "NG",
  };

  return (
    <div className="container section-pad">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-dim">
        <Link href="/" className="hover:text-gold">Home</Link>
        <span>/</span>
        <Link href="/services" className="hover:text-gold">Services</Link>
        <span>/</span>
        <span className="text-gold">{toSentenceCase(service.name)}</span>
      </nav>

      <section className="mt-6">
        <VerticalServiceCard service={service} />
      </section>

      <div className="mt-14 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-8 text-center sm:p-10">
        <SectionHeading
          eyebrow="Need something else?"
          title="Describe what you need"
          subtitle="Tell us your requirements and our team will recommend the right service and price."
          center
        />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/services" className="btn-ghost-gold">Browse all services</Link>
          <Link href="/contact" className="btn-gold">Contact us</Link>
        </div>
      </div>
    </div>
  );
}

function VerticalServiceCard({ service }: { service: Service }) {
  const Icon = resolveServiceIcon({
    slug: service.slug,
    icon: service.icon,
    categoryName: service.category_name,
  });
  const booked = service.bookable !== false;
  const promo = service.promotional_price != null ? service.promotional_price : null;
  const effectiveBase = promo != null ? promo : service.base_price;
  const priceText =
    service.price_type === "fixed"
      ? formatNaira(effectiveBase)
      : service.price_type === "range"
        ? `${formatNaira(service.minimum_price || service.base_price)} – ${formatNaira(service.maximum_price || (service.minimum_price || service.base_price))}`
        : service.price_type === "conditional"
          ? `${formatNaira(service.base_price)}`
          : "Request a Quote";

  return (
    <div className="card-premium flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-center gap-4 sm:w-72">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15">
          <Icon className="h-6 w-6 text-gold-bright" />
        </span>
        <div>
          <h3 className="font-display font-semibold text-white">
            {toSentenceCase(service.name)}
          </h3>
          <p className="text-xs text-text-dim">{service.estimated_duration || "Estimated time varies"}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-text-muted">
          {service.short_description || service.description || "Professional digital service"}
        </p>
        {service.price_notice && (
          <p className="mt-2 text-xs font-medium text-info">{service.price_notice}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {service.is_seasonal && service.season_label && (
            <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
              {service.season_label}
            </span>
          )}
          {!booked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
              Service Not Available
            </span>
          )}
          {service.requires_file_upload && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
              <FileUp className="h-3 w-3" /> Upload
            </span>
          )}
          {service.quotation_required && (
            <span className="inline-flex items-center gap-1 rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-semibold text-info">
              <Type className="h-3 w-3" /> Quote
            </span>
          )}
          {service.delivery_available && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
              <CheckCircle2 className="h-3 w-3" /> Delivery
            </span>
          )}
          {service.requires_physical_presence && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
              <Clock className="h-3 w-3" /> Physical
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="text-right">
          {promo != null && service.base_price > 0 && (
            <p className="text-xs text-text-dim">
              <s>{formatNaira(service.base_price)}</s>
              <span className="ml-1 inline-block rounded bg-success/20 px-1 text-success">Promo</span>
            </p>
          )}
          <p className="text-lg font-bold text-gold-bright">
            {priceText}
            {service.price_unit && service.price_unit !== "fixed" && priceText !== "Request a Quote" && (
              <span className="ml-1 text-xs font-normal text-text-dim">/{service.price_unit}</span>
            )}
          </p>
        </div>
        {booked ? (
          <Link
            href={`/use/${service.slug}`}
            className="btn-gold px-5 py-2 text-sm"
          >
            Check Service <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-5 py-2 text-sm font-semibold text-rose-400">
            Not Available
          </span>
        )}
      </div>
    </div>
  );
}
