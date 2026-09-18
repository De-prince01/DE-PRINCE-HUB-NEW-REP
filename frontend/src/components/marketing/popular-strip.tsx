"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { resolveServiceIcon } from "@/lib/service-icons";
import type { Service } from "@/types";

const POPULAR_NAMES = [
  "JAMB/UTME Registration",
  "NIN (National ID) Registration",
  "BVN (Bank Verification Number)",
  "CAC Business Registration",
  "Binder (Spiral/Soft/Hard)",
  "NYSC Registration Assistance",
  "Passport Booking Assistance",
  "Logo Design",
];

export default function PopularStrip() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    api<Service[]>("/services", { auth: false })
      .then((data) => {
        const byName = new Map(data.map((s) => [s.name.toLowerCase(), s]));
        const picked =
          POPULAR_NAMES.map((n) => byName.get(n.toLowerCase())).filter(
            Boolean
          ) as Service[];
        setServices(picked.length ? picked : data.filter((s) => s.bookable !== false).slice(0, 8));
      })
      .catch(() => setServices([]));
  }, []);

  return (
    <div className="flow-root">
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {services.map((s) => {
          const Icon = resolveServiceIcon({
            slug: s.slug,
            icon: s.icon,
            categoryName: s.category_name,
          });
          const booked = s.bookable !== false;
          const promo = s.promotional_price != null ? s.promotional_price : null;
          const effectiveBase = promo != null ? promo : s.base_price;
          const priceText =
            s.price_type === "fixed"
              ? formatNaira(effectiveBase)
              : s.price_type === "range"
                ? `from ${formatNaira(s.minimum_price || effectiveBase)}`
                : s.price_type === "conditional"
                  ? formatNaira(s.base_price)
                  : "Quote";
          return (
            <Link
              key={s.id}
              href={booked ? `/use/${s.slug}` : "/services"}
              className="group w-60 shrink-0 rounded-xl border border-gold/25 bg-surface-2 p-4 transition-all hover:border-gold/60 hover:shadow-[0_0_25px_rgba(212,168,75,0.15)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="rounded-lg bg-gold/15 p-2">
                  <Icon className="h-4 w-4 text-gold-bright" />
                </div>
                {!booked ? (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                    Not Available
                  </span>
                ) : (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                    Available
                  </span>
                )}
              </div>
              <h4 className="mt-3 line-clamp-2 font-semibold text-white">{s.name}</h4>
              <p className="mt-1 text-xs text-text-dim line-clamp-2">
                {s.short_description || s.description || "DE-PRINCE Digital Hub service"}
              </p>
              {s.price_notice && (
                <p className="mt-2 text-[10px] leading-snug text-info">{s.price_notice}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-bold text-gold-bright">
                  {booked ? priceText : <span className="text-rose-400">Not Available</span>}
                </p>
                <span className="text-xs font-medium text-gold group-hover:underline">
                  Check Service
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <Link
        href="/services"
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-bright"
      >
        View all services <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}