import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Wifi,
  Printer,
  Monitor,
  Coffee,
  ArrowRight,
} from "lucide-react";
import SectionHeading from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "Visit Our Store",
  description:
    "Visit DE-PRINCE DIGITAL HUB at the Federal University of Kashere, Akko LGA, Gombe State for printing, registrations, computers, design and more.",
};

const BRANCHES = [
  {
    name: "DE-PRINCE DIGITAL HUB",
    city: "Gombe State",
    tag: "Main Store",
    address: "Federal University of Kashere, Akko LGA, Gombe State, Nigeria",
    hours: "Mon – Sat: 8:00 AM – 8:00 PM",
    phone: "0701 111 2229",
    wa: "2347011112229",
    email: "deprince969@gmail.com",
    services: ["Full Service Centre", "Cyber Café & Computers", "Registrations Desk", "Printing & Binding"],
    featured: true,
  },
];

export default function BranchesPage() {
  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Visit Us</p>
        <h1 className="section-title mt-3">Visit Our Store</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Walk into the DE-PRINCE DIGITAL HUB store at the Federal University of
          Kashere — or order online and pick up / get delivery in Gombe State.
        </p>
      </section>

      <div className="mt-14 grid gap-6 lg:grid-cols-1">
        {BRANCHES.map((b) => (
          <div key={b.name} className="card-premium mx-auto flex w-full max-w-3xl flex-col p-6">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15">
                <MapPin className="h-5 w-5 text-gold-bright" />
              </span>
              {b.tag && (
                <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-bright">
                  {b.tag}
                </span>
              )}
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-white">{b.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">{b.city}</p>
            <p className="mt-3 flex items-start gap-2 text-sm text-text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {b.address}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
              <Clock className="h-4 w-4 shrink-0 text-gold" /> {b.hours}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
              <Phone className="h-4 w-4 shrink-0 text-gold" /> {b.phone}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
              <Mail className="h-4 w-4 shrink-0 text-gold" /> {b.email}
            </p>

            <div className="mt-5 border-t border-gold/15 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">At this store</p>
              <ul className="mt-2 grid gap-1.5">
                {b.services.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex gap-2">
              <a href={`https://wa.me/${b.wa}`} target="_blank" rel="noreferrer" className="btn-ghost-gold flex-1 px-3 py-2 text-xs">
                WhatsApp
              </a>
              <a href="tel:+2347011112229" className="btn-gold flex-1 px-3 py-2 text-xs">
                Call Store
              </a>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-10">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">What to expect in-store</h2>
            <p className="mt-2 text-sm text-text-muted">
              Cyber café, printing & binding, registrations desk, design studio and a
              place to sit while your work finishes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[Wifi, Printer, Monitor, Coffee].map((Icon, i) => (
              <span key={i} className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/25 bg-ink/50">
                <Icon className="h-5 w-5 text-gold" />
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 text-center">
        <h2 className="font-display text-2xl font-bold text-white">Don&apos;t want to make the trip?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
          Order online and track your order or booking from anywhere via the dashboard.
        </p>
        <Link href="/track" className="btn-gold mt-6 inline-flex">
          Track an order <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}