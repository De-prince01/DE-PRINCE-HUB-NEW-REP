"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingCart, ChevronDown, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/services/jamb-utme-registration", label: "JAMB" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/academy", label: "Academy" },
  { href: "/branches", label: "Branches" },
  { href: "/track", label: "Track Order" },
  { href: "/contact", label: "Contact" },
];

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/verify", label: "Verify Receipt" },
];

export default function SiteHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/services" && pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-gold/15 transition-all",
        scrolled
          ? "bg-ink/90 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-ink/70 backdrop-blur-md"
      )}
    >
      {/* top mini-bar */}
      <div className="hidden border-b border-gold/10 bg-ink md:block">
        <div className="container flex items-center justify-between py-1.5 text-[11px] tracking-wide text-text-dim">
          <p className="font-display uppercase tracking-[0.25em] text-gold/80">
            Everything Digital. One Platform.
          </p>
          <div className="flex items-center gap-5">
            <a href="tel:+2348000000000" className="hover:text-gold-bright">+234 800 000 0000</a>
            <a href="mailto:hello@deprincehub.com" className="hover:text-gold-bright">hello@deprincehub.com</a>
            <Link href="/track" className="text-gold hover:text-gold-bright">Track Order</Link>
          </div>
        </div>
      </div>

      <div className="container flex h-16 items-center justify-between gap-4 md:h-[72px]">
        <Link href="/" className="brand-lockup flex items-center">
          <img
            src="/images/logo-lockup-dark.png"
            alt="DE-PRINCE DIGITAL HUB"
            width={220}
            height={44}
            className="h-11 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "nav-link rounded-md px-3 py-2",
                isActive(link.href) && "nav-link-active"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="group relative">
            <button className="nav-link flex items-center gap-1 rounded-md px-3 py-2">
              More
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 w-56 rounded-xl border border-gold/25 bg-charcoal p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-gold/10 hover:text-gold-bright"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/services"
            className="hidden items-center gap-1.5 rounded-md border border-gold/30 p-2 text-gold transition-colors hover:bg-gold/10 sm:flex"
            aria-label="Browse services"
          >
            <ShoppingCart className="h-4 w-4" />
          </Link>
          {user ? (
            <Link href="/dashboard" className="btn-gold hidden px-4 text-sm sm:inline-flex">
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-md border border-gold/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold/10 sm:inline-flex"
              >
                Sign In
              </Link>
              <Link href="/register" className="btn-gold inline-flex px-4 text-sm">
                Get Started
              </Link>
            </>
          )}
          <button
            className="inline-flex rounded-md border border-gold/30 p-2 text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-gold/15 bg-ink lg:hidden">
          <nav className="container flex max-h-[70vh] flex-col gap-1 overflow-y-auto py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-muted hover:bg-gold/10 hover:text-gold-bright",
                  isActive(link.href) && "bg-gold/10 text-gold-bright"
                )}
              >
                <Sparkles className="h-4 w-4 text-gold/60" />
                {link.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-gold/15" />
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-text-muted hover:bg-gold/10 hover:text-gold-bright"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-gold/15" />
            <Link href="/track" className="rounded-lg px-3 py-2.5 text-sm text-text-muted hover:bg-gold/10 hover:text-gold-bright">
              Verify Receipt
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}