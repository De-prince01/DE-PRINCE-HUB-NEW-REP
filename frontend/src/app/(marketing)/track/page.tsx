"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, PackageSearch, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { API_URL, formatNaira } from "@/lib/utils";

type TrackResult = {
  valid: boolean;
  receipt_number?: string;
  order_number?: string | null;
  total?: number;
  issued_at?: string;
  business?: string;
  message?: string;
};

export default function TrackPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = query.trim();
    if (!ref) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `${API_URL}/receipts/verify/${encodeURIComponent(ref)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as TrackResult;
      setResult(data);
    } catch {
      setResult({
        valid: false,
        message: "Unable to reach the tracking service right now. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section-pad">
      <section className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Track Order</p>
        <h1 className="section-title mt-3">Where Is My Order?</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Enter your receipt number or order reference to verify and check its status.
          Signed in? Your full order history lives in your dashboard.
        </p>
      </section>

      <form onSubmit={track} className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. RCPT-2026-XXXXXX or DP-2026-XXXXXX"
            className="w-full rounded-xl border border-gold/30 bg-surface/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-text-dim focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-gold shrink-0 px-7">
          {loading ? "Checking..." : "Track Order"}
        </button>
      </form>

      {result && (
        <div className="mx-auto mt-10 max-w-xl">
          {result.valid ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
                <div className="w-full">
                  <h2 className="font-display font-semibold text-white">Receipt verified</h2>
                  <p className="mt-1 text-sm text-text-muted">{result.business}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-text-dim">Receipt No.</dt>
                      <dd className="font-semibold text-white">{result.receipt_number}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-dim">Order No.</dt>
                      <dd className="font-semibold text-white">{result.order_number || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-dim">Amount</dt>
                      <dd className="font-semibold text-gold-bright">{formatNaira(result.total || 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-dim">Issued</dt>
                      <dd className="font-semibold text-white">
                        {result.issued_at ? new Date(result.issued_at).toLocaleString("en-GB") : "—"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs text-text-dim">
                    For live status updates, sign in to your dashboard and open the matching order.
                  </p>
                  <Link href="/login" className="btn-gold mt-5 inline-flex">
                    Sign in to view details <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
              <div className="flex items-start gap-4">
                <XCircle className="h-8 w-8 shrink-0 text-danger" />
                <div>
                  <h2 className="font-display font-semibold text-white">No record found</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {result.message || "We could not find that reference. Double-check the number or contact support."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/contact" className="btn-ghost-gold">Contact Support</Link>
                    <Link href="/" className="btn-gold">Back to Home</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-gold/25 bg-surface/40 p-8 text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-4 font-display text-xl font-semibold text-white">
          Signed in? Everything is in your dashboard
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Order status, files, messages, receipts and delivery updates — all in one place.
        </p>
        <Link href="/dashboard" className="btn-gold mt-6">
          Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}