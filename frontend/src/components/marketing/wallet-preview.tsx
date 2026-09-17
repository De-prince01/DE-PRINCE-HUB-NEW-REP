"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  ArrowDownUp,
  ArrowUpRight,
  Receipt,
  ShieldCheck,
  Printer,
  ChevronRight,
  WalletCards,
} from "lucide-react";

export default function WalletPreview() {
  const [balance, setBalance] = useState(0);
  const target = 48250;

  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setBalance(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const naira = (n: number) =>
    "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

  const rows = [
    { icon: ArrowUpRight, label: "JAMB/UTME Registration", amount: -2700, time: "2m ago", up: true },
    { icon: Printer, label: "Binder (Soft cover)", amount: -800, time: "1h ago", up: true },
    { icon: ShieldCheck, label: "NIN Registration", amount: -3500, time: "1h ago", up: true },
    { icon: ArrowDownUp, label: "Wallet funded", amount: 10000, time: "Today", up: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative rounded-2xl border border-gold/30 bg-gradient-to-br from-surface-2 to-ink p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <p className="eyebrow">DE-PRINCE Wallet</p>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-bright">
            ₦ Wallet
          </span>
        </div>
        <p className="mt-4 text-4xl font-bold text-gold-bright">
          {naira(balance)}
        </p>
        <p className="mt-1 text-xs text-text-dim">Available balance</p>

        <div className="mt-5 flex gap-2">
          <button className="btn-gold flex-1 px-3 py-2 text-xs">
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Fund Wallet
          </button>
          <button className="btn-ghost-gold flex-1 px-3 py-2 text-xs">
            <ArrowDownUp className="mr-1 inline h-3.5 w-3.5" /> Transfer
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  r.up ? "bg-danger/15" : "bg-success/15"
                }`}
              >
                <r.icon className={`h-4 w-4 ${r.up ? "text-danger" : "text-success"}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">{r.label}</p>
                <p className="text-[11px] text-text-dim">{r.time}</p>
              </div>
              <p className={`font-semibold ${r.up ? "text-danger" : "text-success"}`}>
                {r.up ? "-" : "+"}
                {naira(Math.abs(r.amount))}
              </p>
            </div>
          ))}
        </div>

        <a
          href="/use"
          className="mt-6 flex items-center justify-between rounded-lg border border-gold/25 bg-ink/60 px-4 py-3 text-sm text-gold-bright transition-colors hover:bg-gold/10"
        >
          <span className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> View all transactions
          </span>
          <ChevronRight className="h-4 w-4" />
        </a>
      </div>
      <div className="absolute -right-3 -top-3 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-charcoal shadow-lg">
        <WalletCards className="h-6 w-6 text-gold" />
      </div>
    </div>
  );
}