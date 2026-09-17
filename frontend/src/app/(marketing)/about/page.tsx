import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Target,
  Eye,
  HeartHandshake,
  Building2,
  Users,
  TrendingUp,
  Award,
} from "lucide-react";
import SectionHeading from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "DE-PRINCE DIGITAL HUB is the everything-digital, one-platform hub for registrations, printing, design, development and computer services in Nigeria.",
};

const VALUES = [
  { icon: Target, title: "Clear & Honest Pricing", desc: "Official fees and our service fee are shown upfront. No hidden charges, ever." },
  { icon: Eye, title: "Transparency", desc: "Track every order, payment and status change in real time on your dashboard." },
  { icon: Users, title: "Customer First", desc: "We build processes around people — phone-first, store-first and online-first." },
  { icon: Award, title: "Quality & Speed", desc: "Same-day turnaround options and quality-checked deliverables on every lane." },
];

const STATS = [
  { value: "20+", label: "Service Categories" },
  { value: "100+", label: "Services Live" },
  { value: "1", label: "Main Store — Kashere" },
  { value: "24/7", label: "Online Ordering" },
];

export default function AboutPage() {
  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">About Us</p>
        <h1 className="section-title mt-3">Everything Digital. One Platform.</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          From a small neighbourhood cyber café to a modern digital hub, DE-PRINCE
          DIGITAL HUB brings every digital service under one trusted roof.
        </p>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="card-premium p-6 text-center">
            <p className="font-display text-3xl font-bold text-gold-bright">{s.value}</p>
            <p className="mt-2 text-sm text-text-dim">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 grid items-start gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Our Story"
            title="From Cyber Café To Digital Hub"
            center={false}
          />
          <div className="mt-6 space-y-4 text-base leading-relaxed text-text-muted">
            <p>
              DE-PRINCE started where most Nigerian digital journeys begin — a
              community computer shop. Every day we saw students, market women,
              business owners and civil servants come in for one digital need or
              another: print a document, register for JAMB, verify a BVN, design
              a flyer.
            </p>
            <p>
              We asked a simple question: <em className="text-gold-bright">why should anyone manage ten logins, ten
              phone numbers and ten receipts just to live a digital life?</em> So we
              built the platform we wished existed — everything digital, on one
              hub, with one wallet, one tracking system and one honest price.
            </p>
            <p>
              Today DE-PRINCE DIGITAL HUB runs a full online platform alongside
              our physical store at the Federal University of Kashere, Akko LGA,
              Gombe State, with registered processing for official services,
              same-day printing, nationwide delivery and an academy that trains
              the next generation of digital workers.
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {[
            { icon: HeartHandshake, title: "Trusted Processing", desc: "Authorized handling of NIN, BVN, CAC, NYSC and official portal services with verified records." },
            { icon: TrendingUp, title: "Work That Turns Up", desc: "Documents, designs and applications delivered — physically or digitally — on time." },
            { icon: Building2, title: "Community-Grounded", desc: "A real store at the Federal University of Kashere in Gombe State, staffed by people who know your campus and community." },
          ].map((v) => (
            <div key={v.title} className="card-premium flex gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold/15">
                <v.icon className="h-5 w-5 text-gold-bright" />
              </span>
              <div>
                <h3 className="font-semibold text-white">{v.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Our Values"
          title="What We Stand For"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="card-premium p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15">
                <v.icon className="h-5 w-5 text-gold-bright" />
              </span>
              <h3 className="mt-4 font-display font-semibold text-white">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 p-10 text-center">
        <h2 className="font-display text-2xl font-bold text-white">Ready to get things done?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
          Everything digital, one platform. Create a free account and start your first order in minutes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-gold">Create free account <ArrowRight className="ml-1 h-4 w-4" /></Link>
          <Link href="/services" className="btn-ghost-gold">Browse services</Link>
        </div>
      </section>
    </div>
  );
}