import Link from "next/link";
import type { Metadata } from "next";
import { Printer, Palette, Code, Monitor, Globe, BookOpen, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "De-Prince Digital Hub | Everything Digital. One Platform.",
  description:
    "Printing, computer services, web development, graphic design, JAMB/NYSC/CAC registrations, document processing and delivery in Nigeria. Start from your phone, continue online, finish in store.",
  keywords: ["De-Prince Digital Hub", "printing Lagos", "JAMB registration", "NYSC", "CAC registration", "web development Abuja", "computer services", "graphic design", "digital hub Nigeria"],
  openGraph: {
    title: "De-Prince Digital Hub | Everything Digital. One Platform.",
    description:
      "Printing, computer services, web development, JAMB/NYSC/CAC registrations, document processing and delivery.",
    type: "website",
    siteName: "De-Prince Digital Hub",
  },
};

const categories = [
  { icon: BookOpen, title: "Academic Services", desc: "Typing, formatting and document services.", href: "/services?cat=academic-services" },
  { icon: Printer, title: "Printing", desc: "Print, scan, bind and photocopy.", href: "/services?cat=printing" },
  { icon: Palette, title: "Graphic Design", desc: "Logos, flyers, posters and brand identity.", href: "/services?cat=graphic-design" },
  { icon: Code, title: "Web Development", desc: "Websites, web apps and APIs.", href: "/services?cat=web-development" },
  { icon: Monitor, title: "Computer Services", desc: "Installation, troubleshooting and support.", href: "/services?cat=computer-services" },
  { icon: Globe, title: "Online Services", desc: "Authorized registrations and applications.", href: "/services?cat=online-services" },
];

const steps = [
  { n: "01", title: "Choose a Service", desc: "Browse our catalogue and pick what you need." },
  { n: "02", title: "Upload & Describe", desc: "Upload files and add your instructions." },
  { n: "03", title: "Pay Securely", desc: "Pay via transfer, card or wallet." },
  { n: "04", title: "Track & Receive", desc: "Track progress and download or pick up." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <a href="/" className="brand">
              <img
                src="/assets/logo-mark.svg"
                alt="DE-PRINCE DIGITAL HUB"
                width="72"
                height="72"
              />
            </a>
            <span className="text-lg font-bold">De-Prince Digital Hub</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">Services</Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2">Sign In</span>
            </Link>
            <Link href="/register" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 text-center">
          <div className="container mx-auto max-w-3xl px-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Everything Digital.{" "}
              <span className="text-primary">One Platform.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Print, design, develop, type, format and much more — all from your
              phone or computer. Order online, track progress, and get your work
              delivered digitally or physically.
            </p>
            <div className="mt-8 flex flex-col gap-3 justify-center sm:flex-row">
              <Link href="/register" className="rounded-md bg-primary px-6 py-3 text-white font-medium hover:bg-primary/90">
                Start an Order
              </Link>
              <Link href="/services" className="rounded-md border bg-background px-6 py-3 text-foreground font-medium hover:bg-muted">
                Browse Services
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-bold">Our Services</h2>
            <p className="mt-2 text-center text-muted-foreground">
              A complete digital-service marketplace
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link key={cat.title} href={cat.href} className="group rounded-xl border p-6 transition hover:border-primary/50 hover:shadow-md">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <cat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{cat.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{cat.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-bold">How It Works</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.n} className="rounded-xl border bg-background p-6">
                  <span className="text-3xl font-bold text-primary/30">{step.n}</span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <p className="flex items-center gap-2 text-sm">
            <img
              src="/assets/logo-mark.svg"
              alt=""
              width="24"
              height="24"
              className="h-5 w-5"
            />
            De-Prince Digital Hub
          </p>
          <p className="text-sm text-muted-foreground">Everything Digital. One Platform.</p>
        </div>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "De-Prince Digital Hub",
            description:
              "Everything Digital. One Platform. Printing, computer services, web development, graphic design, JAMB/NYSC/CAC registrations, document processing and delivery.",
            slogan: "Everything Digital. One Platform.",
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Digital Services",
              itemListElement: [
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Printing" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Computer Services" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Web Development" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Graphic Design" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "JAMB/UTME Registration" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "NYSC Registration" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "CAC Business Registration" } },
              ],
            },
          }),
        }}
      />
    </div>
  );
}
