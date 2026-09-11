"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/hooks/use-toast";
import { Landmark, Layers, CalendarRange } from "lucide-react";
import type { RevenueStreamsReport, RevenueStream, SeasonalityReport } from "@/types";

const STREAM_OPTIONS = [
  "service_fees", "printing", "computer_sessions", "graphic_design", "web_development",
  "website_maintenance", "hosting_management", "business_registration",
  "document_processing", "delivery", "worker_commissions", "training",
  "business_advertising", "subscriptions", "corporate_contracts",
  "digital_documents", "consultation", "equipment_sales", "referral_partnerships",
  "other_configurable",
];

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-44 shrink-0 truncate text-muted-foreground" title={label}>{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
        <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right font-medium tabular-nums">₦{value.toLocaleString()}</span>
    </div>
  );
}

export default function AdminBusinessPage() {
  const [report, setReport] = useState<RevenueStreamsReport | null>(null);
  const [streamMapped, setStreamMapped] = useState<Record<string, number>>({});
  const [seasonality, setSeasonality] = useState<SeasonalityReport | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    api<RevenueStreamsReport>("/business/revenue-streams")
      .then((r) => {
        setReport(r);
        setStreamMapped(Object.fromEntries(r.streams.map((s) => [s.code, s.categories])));
      })
      .catch(() => setReport(null));
    api<SeasonalityReport>("/business/seasonality")
      .then(setSeasonality)
      .catch(() => setSeasonality(null));
  };

  const [catNameRev, setCatNameRev] = useState<Record<string, string>>({});

  const loadCats = () => {
    api<Array<{ id: string; name: string; revenue_stream?: string | null }>>("/services/categories")
      .then((cats) => {
        setCatNameRev(Object.fromEntries(cats.map((c) => [c.id, c.revenue_stream ?? ""])));
        setCats(cats);
      })
      .catch(() => setCats([]));
  };
  const [cats, setCats] = useState<Array<{ id: string; name: string; revenue_stream?: string | null }>>([]);

  useEffect(() => { loadCats(); }, []);

  const tagCategory = async (id: string, code: string) => {
    try {
      await api(`/services/categories/${id}`, { method: "PATCH", body: JSON.stringify({ revenue_stream: code || null }) });
      setCatNameRev((m) => ({ ...m, [id]: code }));
      refresh();
      showToast.success("Stream tag updated");
    } catch (e: any) {
      showToast.error(e?.message ?? "Update failed");
    }
  };

  if (!report) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Revenue report unavailable.</p>;
  }

  const maxRev = Math.max(1, ...report.streams.map((s) => s.revenue));
  const active = report.streams.filter((s) => s.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="h-5 w-5" /> Business Model</h1>
        <p className="text-muted-foreground">Multiple revenue streams, all configurable — no app rewrite to add a new one.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total revenue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatNaira(report.total_revenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active streams</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{active.length}<span className="text-lg text-muted-foreground"> / {report.stream_count}</span></p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unmapped categories</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{report.unmapped_categories}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue by stream</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {report.streams.map((s) => (
            <div key={s.code} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.active ? <Badge variant="success">{s.orders} orders</Badge> : <Badge variant="secondary">Inactive</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{s.categories} categories · {s.kind}</span>
              </div>
              <Bar value={s.revenue} max={maxRev} label={s.code} />
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">{report.note}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4" /> Tag categories to streams</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cats.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <p className="text-sm font-medium">{c.name}</p>
              <select
                className="rounded border bg-background px-2 py-1 text-sm"
                value={catNameRev[c.id] ?? ""}
                onChange={(e) => tagCategory(c.id, e.target.value)}
              >
                <option value="">— unmapped —</option>
                {STREAM_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Seasonality & resilience</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {seasonality ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Active services</p>
                  <p className="text-xl font-bold">{seasonality.total_active_services}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">Seasonal (e.g. JAMB)</p>
                  <p className="text-xl font-bold">{seasonality.seasonal_services}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Year-round</p>
                  <p className="text-xl font-bold">{seasonality.year_round_services}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Revenue that stays if JAMB ends</p>
                  <p className="text-xl font-bold">
                    {(seasonality.share_if_jamb_ends * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium"><CalendarRange className="h-4 w-4" /> Season</p>
                <p className="mt-1 text-muted-foreground">{seasonality.note}</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  Seasonal services ({seasonality.seasonal.length})
                </p>
                {seasonality.seasonal.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No seasonal services configured.</p>
                ) : (
                  <div className="space-y-1.5">
                    {seasonality.seasonal.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="warning">{s.season_label || "Seasonal"}</Badge>
                          <span className="hidden text-muted-foreground sm:inline">{s.season_months.length} months in season</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  Year-round backbone — revenue if the JAMB season ends
                </p>
                <div className="space-y-1.5">
                  {seasonality.year_round_backbone.map((b) => (
                    <div key={b.category} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                      <span className="font-medium">{b.category}</span>
                      <span className="text-muted-foreground">{b.services} services</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Year-round stream tags:{" "}
                  {seasonality.year_round_streams.map((s) => (
                    <Badge key={s} variant="outline" className="mr-1">{s}</Badge>
                  ))}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Seasonality report unavailable.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}