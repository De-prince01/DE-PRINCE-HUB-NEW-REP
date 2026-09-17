import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { API_URL } from "@/lib/utils";
import ServiceDetailClient from "./client";
import type { Service } from "@/types";

export const dynamic = "force-dynamic";

async function fetchService(slug: string): Promise<Service | null> {
  try {
    const res = await fetch(`${API_URL}/services/by-slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const svc = (await res.json()) as Service;
    try {
      const cRes = await fetch(`${API_URL}/services/categories`, { cache: "no-store" });
      if (cRes.ok) {
        const cats = (await cRes.json()) as Array<{ id: string; name: string }>;
        svc.category_name =
          cats.find((c) => c.id === svc.category_id)?.name ?? null;
      }
    } catch {
      /* category name is a nicety */
    }
    return svc;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const service = await fetchService(params.slug);
  if (!service) {
    return { title: "Service not found | De-Prince Digital Hub" };
  }
  const description =
    service.short_description ||
    service.description ||
    `${service.name} at De-Prince Digital Hub - everything digital, one platform.`;
  const title = `${service.name} | De-Prince Digital Hub`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/use/${service.slug}`,
      siteName: "De-Prince Digital Hub",
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const service = await fetchService(params.slug);
  if (!service) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description:
      service.short_description ||
      service.description ||
      `${service.name} at De-Prince Digital Hub.`,
    provider: {
      "@type": "LocalBusiness",
      name: "De-Prince Digital Hub",
    },
    category: service.category_name || "Digital Services",
    offers: {
      "@type": "Offer",
      price: service.base_price,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiceDetailClient slug={params.slug} initial={service} />
    </>
  );
}