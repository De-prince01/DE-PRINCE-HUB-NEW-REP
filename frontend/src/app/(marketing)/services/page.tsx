import type { Metadata } from "next";
import Link from "next/link";
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
} from "lucide-react";
import { fetchCategories, fetchCatalogue } from "@/lib/catalogue";
import SectionHeading from "@/components/marketing/section-heading";
import ServicesSearch from "@/components/marketing/services-search";
import type { ServiceCategory } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Services & Prices",
  description:
    "Browse the full DE-PRINCE DIGITAL HUB catalogue — JAMB, NIN, BVN, CAC, NYSC registrations, printing, design, development and computer services with clear prices in Naira.",
  openGraph: {
    title: "All Services & Prices | DE-PRINCE DIGITAL HUB",
    description:
      "Browse the full DE-PRINCE catalogue with clear prices in Naira.",
    type: "website",
  },
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "academic services": BookOpen,
  "academic": BookOpen,
  "printing": Printer,
  "graphic design": Palette,
  "design": Palette,
  "web development": Code,
  "web": Code,
  "computer services": Monitor,
  "computer": Monitor,
  "online services": Globe,
  "online": Globe,
  "jamb services": GraduationCap,
  "jamb": GraduationCap,
  "government & identity": Landmark,
  "government": Landmark,
  "identity": ShieldCheck,
};

const FALLBACK_CATEGORIES: ServiceCategory[] = [
  { id: "cat-academic", name: "Academic Services", slug: "academic-services", description: "Typing, formatting and academic document services.", display_order: 1, is_active: true },
  { id: "cat-printing", name: "Printing", slug: "printing", description: "Print, scan, bind and photocopy.", display_order: 2, is_active: true },
  { id: "cat-design", name: "Graphic Design", slug: "graphic-design", description: "Logos, flyers, posters and brand identity.", display_order: 3, is_active: true },
  { id: "cat-web", name: "Web Development", slug: "web-development", description: "Websites, web apps and APIs.", display_order: 4, is_active: true },
  { id: "cat-computer", name: "Computer Services", slug: "computer-services", description: "Installation, troubleshooting and support.", display_order: 5, is_active: true },
  { id: "cat-online", name: "Online Services", slug: "online-services", description: "Authorized registrations and applications.", display_order: 6, is_active: true },
  { id: "cat-gov", name: "Government & Identity", slug: "government-identity", description: "NIN, BVN, CAC and official document processing.", display_order: 7, is_active: true },
];

export default async function ServicesIndexPage() {
  let categories = FALLBACK_CATEGORIES;
  let offline = true;
  try {
    const c = await fetchCategories();
    categories = c.categories.length ? c.categories : FALLBACK_CATEGORIES;
    offline = c.offline;
  } catch {
    categories = FALLBACK_CATEGORIES;
  }

  const counts: Record<string, number> = {};
  if (!offline) {
    try {
      const { services } = await fetchCatalogue();
      for (const s of services) {
        counts[s.category_id] = (counts[s.category_id] || 0) + 1;
      }
    } catch {
      /* counts are a nicety */
    }
  }

  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Service Catalogue</p>
        <h1 className="section-title mt-3">Everything Digital. One Platform.</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Browse every DE-PRINCE service with honest, transparent Naira pricing.
          Pick a category — registrations, documents, printing, design, development
          or computers.
        </p>
      </section>

      <ServicesSearch />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const Icon =
            CATEGORY_ICONS[cat.name.toLowerCase()] ||
            CATEGORY_ICONS[cat.slug.toLowerCase()] ||
            BookOpen;
          return (
            <Link
              key={cat.id}
              href={`/services/${cat.slug}`}
              data-cat={cat.name.toLowerCase()}
              className="card-premium group flex flex-col p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15">
                  <Icon className="h-6 w-6 text-gold-bright" />
                </span>
                <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">
                  {counts[cat.id] != null ? `${counts[cat.id]} services` : "Live pricing"}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">
                {cat.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">
                {cat.description || "Professional digital service"}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold group-hover:underline">
                Browse {cat.name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-16 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-8 text-center sm:p-12">
        <SectionHeading
          eyebrow="Need something specific?"
          title="Not sure where to start?"
          subtitle="Tell us what you need and we'll route it to the right service. Our team replies fast."
        />
        <Link href="/contact" className="btn-gold mt-7">
          Talk to us <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}