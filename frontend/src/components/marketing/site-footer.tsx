import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  X,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";

const SERVICE_COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Popular Services",
    links: [
      { label: "JAMB / UTME Registration", href: "/services/jamb-utme-registration" },
      { label: "NIN Registration", href: "/services/nin-national-id-registration" },
      { label: "BVN Registration", href: "/services/bvn-bank-verification-number" },
      { label: "CAC Business Registration", href: "/services/cac-business-registration" },
      { label: "Binder & Printing", href: "/services?cat=printing" },
      { label: "Graphic Design", href: "/services?cat=graphic-design" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "All Services", href: "/services" },
      { label: "Service Console", href: "/use" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Academy", href: "/academy" },
      { label: "Track Order", href: "/track" },
      { label: "Verify Receipt", href: "/verify" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Branches", href: "/branches" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Refund Policy", href: "/legal/refund" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-gold/20 bg-ink">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        {/* brand */}
        <div>
          <div className="brand-lockup">
            <img
              src="/images/logo-lockup-dark.png"
              alt="DE-PRINCE DIGITAL HUB"
              width={220}
              height={44}
              className="h-12 w-auto"
            />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
            Everything Digital. One Platform. A complete digital hub for
            printing, registrations, design, development and document services
            across Nigeria.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href="#"
              className="rounded-lg border border-gold/25 p-2 text-text-muted transition-colors hover:bg-gold/10 hover:text-gold-bright"
              aria-label="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="rounded-lg border border-gold/25 p-2 text-text-muted transition-colors hover:bg-gold/10 hover:text-gold-bright"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="rounded-lg border border-gold/25 p-2 text-text-muted transition-colors hover:bg-gold/10 hover:text-gold-bright"
              aria-label="X"
            >
              <X className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/2348000000000"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gold/25 p-2 text-text-muted transition-colors hover:bg-gold/10 hover:text-gold-bright"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>

        {SERVICE_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-gold">
              {col.title}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-gold-bright"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* contact */}
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-gold">
            Contact Us
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-text-muted">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>Main Branch: 1 Digital Hub Plaza, Iyana-Ipaja, Lagos, Nigeria</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-gold" />
              <a href="tel:+2348000000000" className="hover:text-gold-bright">
                +234 800 000 0000
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-gold" />
              <a href="mailto:hello@deprincehub.com" className="hover:text-gold-bright">
                hello@deprincehub.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>Mon – Sat: 8:00 AM – 8:00 PM<br />Sun: Closed</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gold/15 py-6">
        <div className="container flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-text-dim">
            © {new Date().getFullYear()} DE-PRINCE DIGITAL HUB. All rights reserved.
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold/70">
            Everything Digital. One Platform.
          </p>
        </div>
      </div>
    </footer>
  );
}