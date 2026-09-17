import type { Metadata } from "next";
import Link from "next/link";
import {
  UserRound,
  Star,
  Briefcase,
  ArrowRight,
  Verified,
  Users,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import SectionHeading from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "Workers & Freelancer Marketplace",
  description:
    "Hire verified freelancers and DE-PRINCE workers for typing, design, web development, computer repairs, delivery and more.",
};

const SPECIALTIES = [
  { icon: Briefcase, label: "Typing & Data Entry", desc: "Assignments, projects and document work." },
  { icon: Star, label: "Graphic Design", desc: "Logos, flyers and brand materials." },
  { icon: Verified, label: "Web Development", desc: "Websites, apps and maintenance." },
  { icon: Wrench, label: "Computer Repairs", desc: "Repairs, installation and cleanup." },
];

const HOW = [
  { n: "01", title: "Browse verified profiles", desc: "Workers are vetted, rated and available across specialties." },
  { n: "02", title: "Assign to your order", desc: "Attach a worker to any order that needs on-the-ground delivery." },
  { n: "03", title: "Pay securely & review", desc: "Payments clear through the platform; ratings keep quality high." },
];

export default function MarketplacePage() {
  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Worker Marketplace</p>
        <h1 className="section-title mt-3">Verified Hands, Vetted Skills</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Connect with trusted DE-PRINCE workers and freelancers for assignments,
          deliveries and skilled work — with ratings, secure payments and platform
          support.
        </p>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SPECIALTIES.map((s) => (
          <div key={s.label} className="card-premium p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15">
              <s.icon className="h-5 w-5 text-gold-bright" />
            </span>
            <h3 className="mt-4 font-display font-semibold text-white">{s.label}</h3>
            <p className="mt-2 text-sm text-text-muted">{s.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="How it works" title="Hiring is simple" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {HOW.map((h) => (
            <div key={h.n} className="card-premium p-6">
              <span className="font-display text-4xl font-bold text-gold/25">{h.n}</span>
              <h3 className="mt-4 font-display font-semibold text-white">{h.title}</h3>
              <p className="mt-2 text-sm text-text-muted">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-10">
          <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="eyebrow">Marketplace features</p>
              <h2 className="font-display text-2xl font-bold text-white">
                Built for quality and trust
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Verified, t: "Verified profiles", d: "Identity-checked workers only." },
                  { icon: Star, t: "Ratings & reviews", d: "Transparent reputation system." },
                  { icon: ShieldCheck, t: "Secure payments", d: "Platform-cleared, escrow-style." },
                  { icon: Users, t: "Specialist search", d: "Filter by specialty instantly." },
                ].map((f) => (
                  <div key={f.t} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15">
                      <f.icon className="h-4 w-4 text-gold-bright" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{f.t}</p>
                      <p className="text-xs text-text-muted">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
                <UserRound className="h-8 w-8 text-gold-bright" />
              </span>
              <p className="mt-4 font-display text-3xl font-bold text-gold-bright">Join the pool</p>
              <p className="mt-2 text-sm text-text-muted">Workers are reviewing profiles now.</p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/register" className="btn-gold">Register as worker</Link>
                <Link href="/use" className="btn-ghost-gold">Browse services</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-16 text-center">
        <Link href="/faq" className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold-bright">
          Read the FAQ <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}