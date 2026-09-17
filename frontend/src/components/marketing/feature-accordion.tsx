"use client";

import { useState } from "react";
import { ChevronDown, Printer, ShieldCheck, Wallet, Truck, ImageIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Printer,
    title: "One Hub For Every Digital Need",
    body: "JAMB & UTME registrations, CAC, NIN, BVN, contracts, certificates, project binding, graphic design, web development, computer repairs and renewals — start from your phone, continue online, finish in store.",
  },
  {
    icon: Wallet,
    title: "Integrated Wallet, Pay Your Way",
    body: "Fund your DE-PRINCE wallet by bank transfer or card, or check out directly. Track every payment and refund transparently in your dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & Secure Processing",
    body: "All data is processed in line with Nigerian privacy law (NDPR), encrypted in transit, and stored for the shortest lawful period. Explore our Data Governance centre for full control.",
  },
  {
    icon: Truck,
    title: "Track It, Then Receive It",
    body: "Every order gets a reference number you can track in real time. Collect at any branch or have it delivered to your door.",
  },
  {
    icon: ImageIcon,
    title: "Digital Delivery Of Finished Work",
    body: "PDFs, images, source files and certificates are delivered to your account and messenger — download them anywhere, anytime.",
  },
  {
    icon: Zap,
    title: "Same-Day Options Nationwide",
    body: "Urgent printing, rush design and next-day delivery are available at our Kashere store and across Gombe State — just pick the fast lane.",
  },
];

export default function FeatureAccordion() {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      {FEATURES.map((f, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className={cn(
              "overflow-hidden rounded-xl border bg-surface-2 transition-all duration-200",
              isOpen
                ? "border-gold/60 shadow-[0_0_25px_rgba(212,168,75,0.15)]"
                : "border-gold/20 hover:border-gold/40"
            )}
          >
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isOpen ? "bg-gold text-ink" : "bg-gold/15 text-gold-bright"
                  )}
                >
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="font-semibold text-white">{f.title}</span>
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-gold transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-text-muted">{f.body}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}