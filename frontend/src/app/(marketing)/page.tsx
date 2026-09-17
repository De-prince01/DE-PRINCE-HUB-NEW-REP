import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Printer,
  Palette,
  Code,
  Monitor,
  Globe,
  Landmark,
  ShieldCheck,
  Banknote,
  GraduationCap,
  UserRound,
  Building2,
  Fingerprint,
  Vote,
  Plane,
  Layers,
  Sparkles,
  Star,
  Quote,
  CheckCircle2,
  MapPin,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { fetchCatalogue } from "@/lib/catalogue";
import { toSentenceCase } from "@/lib/sentence";
import { formatNaira } from "@/lib/utils";
import TrustStrip from "@/components/marketing/trust-strip";
import SectionHeading from "@/components/marketing/section-heading";
import FeatureAccordion from "@/components/marketing/feature-accordion";
import WalletPreview from "@/components/marketing/wallet-preview";
import PopularStrip from "@/components/marketing/popular-strip";
import NewsletterForm from "@/components/marketing/newsletter-form";
import type { Service, ServiceCategory } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DE-PRINCE DIGITAL HUB | Everything Digital. One Platform.",
  description:
    "Printing, computer services, web development, graphic design, JAMB/NYSC/CAC/NIN/BVN registrations, document processing and delivery in Nigeria. Everything Digital. One Platform.",
  keywords: [
    "DE-PRINCE DIGITAL HUB",
    "JAMB registration",
    "NIN registration",
    "BVN",
    "CAC business registration",
    "printing Lagos",
    "digital hub Nigeria",
    "web development",
    "graphic design",
  ],
  openGraph: {
    title: "DE-PRINCE DIGITAL HUB | Everything Digital. One Platform.",
    description:
      "Everything Digital. One Platform. Printing, computers, design, development, registrations and delivery across Nigeria.",
    type: "website",
    url: "/",
    siteName: "DE-PRINCE DIGITAL HUB",
  },
};

const HOW_IT_WORKS = [
  { n: "01", icon: BookOpen, title: "Choose a Service", desc: "Browse the catalogue and pick exactly what you need — registrations, printing, design, development and more." },
  { n: "02", icon: UserRound, title: "Upload & Describe", desc: "Attach documents, fill the quick form and tell us what you want. No account spam, no phone queues." },
  { n: "03", icon: Banknote, title: "Pay Securely", desc: "Pay by transfer, card or DE-PRINCE wallet. Every payment is transparent and receipted automatically." },
  { n: "04", icon: Star, title: "Track & Receive", desc: "Follow your order in real time, then download it digitally or collect it at your nearest branch." },
];

const WHY_US = [
  { icon: ShieldCheck, title: "Verified & Trusted", desc: "Authorized processing partner for NIN, BVN, CAC and official government portals." },
  { icon: Printer, title: "One-Stop Digital Hub", desc: "From a single page print to a full brand website — everything lives under one platform." },
  { icon: Banknote, title: "Clear, Honest Pricing", desc: "Official fees plus a transparent DE-PRINCE service fee, shown before you pay." },
  { icon: Monitor, title: "Hybrid, Anywhere Work", desc: "Start online, continue in-store or fully remote — with nationwide delivery." },
  { icon: Sparkles, title: "Speed & Quality", desc: "Same-day turnaround options and quality checks on every deliverable." },
  { icon: Wallet, title: "Wallet & Loyalty", desc: "Fund once, spend across services, and earn through referrals and subscriptions." },
];

const TESTIMONIALS = [
  { name: "Adebayo O.", role: "JAMB Candidate Parent, Lagos", text: "My son's JAMB registration was handled completely online — I got the profile, pin and confirmation without leaving home." },
  { name: "Chiamaka N.", role: "Business Owner, Abuja", text: "CAC registration and my business website were both done on DE-PRINCE. One platform truly handles everything digital." },
  { name: "Tunde A.", role: "Freelance Designer, Ibadan", text: "The binding and colour printing quality is excellent, and the wallet flow makes repeat orders effortless." },
  { name: "Grace E.", role: "NYSC Corps Member", text: "NYSC registration, passport booking assistance and certificate printing — all smooth and on time." },
];

const BRANCHES = [
  { icon: MapPin, name: "Iyana-Ipaja Branch", city: "Lagos", addr: "1 Hub Plaza, Iyana-Ipaja Road", time: "8AM – 8PM" },
  { icon: MapPin, name: "Agege Branch", city: "Lagos", addr: "Old Lagos-Abeokuta Expressway", time: "8AM – 8PM" },
  { icon: MapPin, name: "Wuse Branch", city: "Abuja", addr: "Wuse Zone 4, Abuja", time: "9AM – 6PM" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "DE-PRINCE DIGITAL HUB",
  slogan: "Everything Digital. One Platform.",
  description:
    "Everything Digital. One Platform. Printing, computer services, web development, graphic design, JAMB/NYSC/CAC/NIN/BVN registrations, document processing and delivery across Nigeria.",
  telephone: "+2348000000000",
  email: "hello@deprincehub.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "1 Digital Hub Plaza, Iyana-Ipaja",
    addressLocality: "Lagos",
    addressCountry: "NG",
  },
  hasOfferCatalog: null,
};

export default async function HomePage() {
  const { services } = await fetchCatalogue();
  const displayServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 15);
  const showFallback = displayServices.length === 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1 · HERO (image block) */}
      <section className="hero-image">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/hero-digital-hub.svg)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink/90 via-ink/80 to-ink/60" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
        <div className="container relative flex min-h-[88vh] flex-col items-center justify-center py-20 text-center">
          <p className="eyebrow">DE-PRINCE DIGITAL HUB</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Everything Digital.
            <br />
            <span className="bg-gradient-to-r from-gold-bright via-gold to-gold-deep bg-clip-text text-transparent">
              One Platform.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
            JAMB & UTME, NIN, BVN, CAC, NYSC, printing, design, development,
            computers and delivery — start from your phone, continue online,
            finish in store.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/services" className="btn-gold px-7 py-3 text-base">
              Explore Services <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/track"
              className="btn-ghost-gold px-7 py-3 text-base"
            >
              Track an Order
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold uppercase tracking-widest text-text-dim">
            {["Trusted & Verified", "Same-Day Options", "Nationwide Delivery"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 2 · TRUST STRIP */}
      <TrustStrip />

      {/* 3 · WELCOME BLOCK */}
      <section className="section-pad">
        <div className="container">
          <SectionHeading
            eyebrow="Welcome"
            title="One Hub, Every Digital Need"
            subtitle="DE-PRINCE DIGITAL HUB brings official registrations, document work, creative services and hardware care together in one verified platform — online, in-store or delivered."
          />
        </div>
      </section>

      {/* 4 · SERVICES GRID (15 cards) */}
      <section className="pb-20">
        <div className="container">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Service Catalogue"
              title="Our Services"
              subtitle="Fifteen service lanes, one platform. Prices start from as low as ₦50 per page."
              center={false}
            />
            <Link href="/services" className="group inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-bright">
              See all services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(showFallback ? FALLBACK_CARDS : displayServices).map((svc, i) => (
              <ServiceTile
                key={("id" in svc ? svc.id : `fb-${i}`) as string}
                name={"name" in svc ? svc.name : svc.title}
                desc={"name" in svc ? svc.short_description || svc.description || "" : svc.desc}
                price={"name" in svc ? svc.base_price : svc.price}
                unit={"name" in svc ? svc.price_unit : svc.unit}
                icon={"name" in svc ? undefined : svc.icon}
                href={"name" in svc ? `/services/${svc.slug}` : svc.href}
              />
            ))}
            <Link
              href="/services"
              className="group flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-gold/30 bg-surface/40 p-6 text-center transition hover:border-gold/70 hover:bg-gold/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                <ArrowRight className="h-6 w-6 text-gold" />
              </span>
              <p className="mt-4 font-display font-semibold text-white">And many more</p>
              <p className="mt-1 text-sm text-text-dim">Browse the full catalogue</p>
            </Link>
          </div>
        </div>
      </section>

      {/* 5 · FEATURE SPOTLIGHT */}
      <section className="section-pad border-y border-gold/10 bg-charcoal/40">
        <div className="container grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <SectionHeading
              eyebrow="Why DE-PRINCE"
              title="Built Like A Platform, Run Like A Neighbourhood Hub"
              subtitle="Every feature — payments, tracking, delivery, privacy — works across every service so you get one consistent experience, not fifteen logins."
              center={false}
            />
            <Link href="/register" className="btn-gold mt-8">
              Create free account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <FeatureAccordion />
        </div>
      </section>

      {/* 6 · HOW IT WORKS */}
      <section className="section-pad">
        <div className="container">
          <SectionHeading
            eyebrow="How It Works"
            title="From Request To Delivery In Four Steps"
            subtitle="No experience needed — the platform guides you through every step."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.n} className="card-premium p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15">
                    <step.icon className="h-6 w-6 text-gold-bright" />
                  </span>
                  <span className="font-display text-4xl font-bold text-gold/25">{step.n}</span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 · WALLET PREVIEW */}
      <section className="section-pad border-y border-gold/10 bg-gradient-to-br from-charcoal/60 to-ink">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="DE-PRINCE Wallet"
              title="One Wallet For Every Service"
              subtitle="Fund once, pay for registrations, printing, design and more from a single balance — with instant receipts and full transaction history."
              center={false}
            />
            <ul className="mt-7 space-y-3">
              {[
                "Fund by bank transfer or card",
                "Instant refunds & transparent ledger",
                "Referral rewards paid straight to wallet",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-text-muted">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/use" className="btn-gold mt-8">
              Open Service Console <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <WalletPreview />
        </div>
      </section>

      {/* 8 · WHY CHOOSE US */}
      <section className="section-pad">
        <div className="container">
          <SectionHeading
            eyebrow="Why Choose Us"
            title="The Digital Hub Nigeria Trusts"
            subtitle="Everything digital, one platform — backed by process, people and guarantees."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_US.map((item) => (
              <div key={item.title} className="card-premium p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15">
                  <item.icon className="h-5 w-5 text-gold-bright" />
                </span>
                <h3 className="mt-4 font-display font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9 · POPULAR RIGHT NOW */}
      <section className="section-pad border-y border-gold/10 bg-charcoal/40">
        <div className="container">
          <SectionHeading
            eyebrow="Trending"
            title="Popular Right Now"
            subtitle="The services our customers order most this season."
          />
          <div className="mt-10">
            <PopularStrip />
          </div>
        </div>
      </section>

      {/* 10 · TESTIMONIALS */}
      <section className="section-pad">
        <div className="container">
          <SectionHeading
            eyebrow="Testimonials"
            title="What Our Customers Say"
            subtitle="Real feedback from customers across Lagos and Abuja."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="card-premium flex flex-col p-6">
                <Quote className="h-6 w-6 text-gold/50" />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-text-muted">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-5 border-t border-gold/15 pt-4">
                  <p className="flex items-center gap-1 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                    ))}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-text-dim">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 11 · ACADEMY BAND */}
      <section className="section-pad border-y border-gold/10 bg-gradient-to-r from-gold-deep/20 via-gold/10 to-gold-deep/20">
        <div className="container grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">DE-PRINCE Academy</p>
            <h2 className="section-title mt-3">
              Learn The Digital Skills That Pay
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-text-muted">
              Computer appreciation, typing, design, web development and digital
              literacy courses — taught by the same team that runs the hub. Hands-on,
              certificate at the end, and practical project work throughout.
            </p>
            <Link href="/academy" className="btn-gold mt-7">
              Explore the Academy <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: GraduationCap, v: "20+", l: "Courses & Labs" },
              { icon: UserRound, v: "1,200+", l: "Students Trained" },
              { icon: Sparkles, v: "90%", l: "Practical Hours" },
              { icon: Star, v: "4.9", l: "Average Rating" },
            ].map((s) => (
              <div key={s.l} className="card-premium p-5 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
                  <s.icon className="h-5 w-5 text-gold-bright" />
                </span>
                <p className="mt-3 font-display text-2xl font-bold text-gold-bright">{s.v}</p>
                <p className="text-xs text-text-dim">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12 · BRANCH CTA */}
      <section className="section-pad">
        <div className="container">
          <SectionHeading
            eyebrow="Visit Us"
            title="Find A Branch Near You"
            subtitle="Walk in at any branch — or do everything online and just pick it up."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {BRANCHES.map((b) => (
              <Link key={b.name} href="/branches" className="card-premium p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15">
                  <b.icon className="h-5 w-5 text-gold-bright" />
                </span>
                <h3 className="mt-4 font-display font-semibold text-white">{b.name}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gold">{b.city}</p>
                <p className="mt-2 text-sm text-text-muted">{b.addr}</p>
                <p className="mt-1 text-xs text-text-dim">{b.time}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 13 · NEWSLETTER */}
      <section className="border-t border-gold/10 bg-charcoal/40 py-16">
        <div className="container max-w-3xl text-center">
          <p className="eyebrow">Stay in the loop</p>
          <h2 className="section-title mt-3">Get deals, deadlines & tips</h2>
          <p className="mt-4 text-sm text-text-muted">
            Join the DE-PRINCE newsletter for seasonal registration windows
            (JAMB, NYSC, NIN), promotions and digital-skills resources.
          </p>
          <div className="mt-7">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}

const FALLBACK_CARDS = [
  { icon: BookOpen, title: "Academic & Document Services", desc: "Typing, formatting, data entry and presentations.", price: 500, unit: "page", href: "/services/academic-document-services" },
  { icon: GraduationCap, title: "JAMB / UTME Registration", desc: "Profile creation, PIN, printing and corrections.", price: 2700, unit: "candidate", href: "/services/jamb-utme-registration" },
  { icon: Printer, title: "Printing & Binding", desc: "B/W & colour printing, binding, lamination.", price: 100, unit: "copy", href: "/services/printing-binding" },
  { icon: Fingerprint, title: "NIN Registration", desc: "NIN enrolment, retrieval and printing.", price: 3500, unit: "person", href: "/services/nin-national-id-registration" },
  { icon: Fingerprint, title: "BVN Registration", desc: "BVN enrolment and linkage support.", price: 2000, unit: "person", href: "/services/bvn-bank-verification-number" },
  { icon: Building2, title: "CAC Business Registration", desc: "Business name and company registration.", price: 15000, unit: "business", href: "/services/cac-business-registration" },
  { icon: Palette, title: "Graphic Design", desc: "Logos, flyers and brand identity.", price: 5000, unit: "job", href: "/services/graphic-design-branding" },
  { icon: Code, title: "Web Development", desc: "Business sites, e-commerce and apps.", price: 50000, unit: "project", href: "/services/web-development" },
  { icon: Monitor, title: "Computer Services", desc: "Installation, repairs and virus cleanup.", price: 2000, unit: "job", href: "/services/computer-services" },
  { icon: Globe, title: "Online Services", desc: "Portal applications & renewals.", price: 2000, unit: "application", href: "/services/online-services" },
  { icon: Landmark, title: "Government Assistance", desc: "Official portal navigation & filings.", price: 5000, unit: "case", href: "/services/government-portal-assistance" },
  { icon: Plane, title: "Passport Booking", desc: "Passport application and booking help.", price: 10000, unit: "booking", href: "/services/passport-booking-assistance" },
  { icon: Layers, title: "Lamination & Scanning", desc: "Document protection and digitization.", price: 200, unit: "sheet", href: "/services/lamination-scanning" },
  { icon: Vote, title: "Voter Registration", desc: "INEC voter registration booking.", price: 3000, unit: "booking", href: "/services/voter-registration-booking" },
  { icon: Building2, title: "Business Registration Assistance", desc: "Step-by-step CAC & filings support.", price: 5000, unit: "case", href: "/services/business-registration-assistance" },
] as const;

function ServiceTile({
  name,
  desc,
  price,
  unit,
  icon,
  href,
}: {
  name: string;
  desc: string;
  price: number;
  unit: string;
  icon?: React.ComponentType<{ className?: string }>;
  href: string;
}) {
  const Icon = icon ?? BookOpen;
  return (
    <Link
      href={href}
      className="service-card group flex flex-col p-5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15 transition-colors group-hover:bg-gold group-hover:text-ink">
        <Icon className="h-5 w-5 text-gold-bright transition-colors group-hover:text-ink" />
      </span>
      <h3 className="mt-4 font-display font-semibold text-white">{toSentenceCase(name)}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-text-dim line-clamp-2">{desc}</p>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-gold-bright">
          {formatNaira(price)}
          <span className="text-xs font-normal text-text-dim"> /{unit}</span>
        </p>
        <span className="text-xs font-semibold text-gold group-hover:underline">
          Check Service <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}