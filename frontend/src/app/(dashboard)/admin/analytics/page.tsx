"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Wallet, Hash, Users, Crown, Clock, Gift, BarChart3,
} from "lucide-react";
import type { AnalyticsOverview } from "@/types";

function Bar({ value, max, label, suffix = "" }: { value: number; max: number; label: string; suffix?: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-40 shrink-0 truncate text-muted-foreground" title={label}>{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
        <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right font-medium tabular-nums">{suffix}{value.toLocaleString()}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [ov, setOv] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<AnalyticsOverview>("/analytics/overview")
      .then(setOv)
      .catch(() => setOv(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-64 animate-pulse" />;
  }
  if (!ov) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Analytics unavailable.</p>;
  }

  const maxSvc = Math.max(1, ...ov.revenue_by_service.map((x) => x.revenue));
  const maxBr = Math.max(1, ...ov.revenue_by_branch.map((x) => x.revenue));
  const maxPm = Math.max(1, ...ov.revenue_by_payment_method.map((x) => x.amount));
  const maxExp = Math.max(1, ...ov.expenses_by_category.map((x) => x.amount));
  const maxAcq = Math.max(1, ...ov.customer_acquisition.map((x) => x.new_customers));
  const wr = ov.customer_retention;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Business Analytics</h1>
        <p className="text-muted-foreground">Performance, revenue, retention and referrals at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatNaira(ov.summary.total_revenue)}</p>
            <p className="text-xs text-muted-foreground">30d: {formatNaira(ov.summary.revenue_last_30d)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4" /> Expenses</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatNaira(ov.summary.total_expenses)}</p>
            <p className="text-xs text-muted-foreground">30d: {formatNaira(ov.summary.expenses_last_30d)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Profit</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatNaira(ov.summary.profit)}</p>
            <p className="text-xs text-muted-foreground">30d: {formatNaira(ov.summary.profit_last_30d)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Hash className="h-4 w-4" /> Orders</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{ov.summary.total_orders}</p>
            <p className="text-xs text-muted-foreground">revenue/total in range</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-4 w-4" /> Top services</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ov.most_ordered_services.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
            {ov.most_ordered_services.map((s) => (
              <div key={s.service} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.service}</p>
                  <p className="text-xs text-muted-foreground">{s.orders} orders · {s.units} units</p>
                </div>
                <span className="ml-2 shrink-0 font-semibold">{formatNaira(s.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Most profitable service</CardTitle></CardHeader>
          <CardContent>
            {ov.most_profitable_service.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-semibold">{ov.most_profitable_service[0].service}</p>
                  <p className="text-xs text-muted-foreground">{ov.most_profitable_service[0].orders} orders</p>
                </div>
                <Badge variant="success">{formatNaira(ov.most_profitable_service[0].revenue)}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by service</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ov.revenue_by_service.map((x) => <Bar key={x.service} value={x.revenue} max={maxSvc} label={x.service} suffix="₦" />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by branch</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ov.revenue_by_branch.map((x) => <Bar key={x.branch} value={x.revenue} max={maxBr} label={x.branch} suffix="₦" />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by payment method</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ov.revenue_by_payment_method.map((x) => <Bar key={x.method} value={x.amount} max={maxPm} label={x.method} suffix="₦" />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expenses by category</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ov.expenses_by_category.map((x) => <Bar key={x.category} value={x.amount} max={maxExp} label={x.category} suffix="₦" />)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Customer retention</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{wr.retention_rate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{wr.repeat_customers} repeat of {wr.total_customers} customers</p>
            <p className="mt-2 text-xs text-muted-foreground">Avg {wr.avg_orders_per_customer} orders per customer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Customer acquisition</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ov.customer_acquisition.map((m) => <Bar key={m.month} value={m.new_customers} max={maxAcq} label={m.month} suffix="" />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Order completion time</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ov.order_completion_time.avg_completion_days.toFixed(1)} days</p>
            <p className="text-xs text-muted-foreground">
              avg {ov.order_completion_time.avg_completion_hours.toFixed(1)} h over {ov.order_completion_time.completed_orders} completed orders
            </p>
            {ov.order_completion_time.min_hours != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                min {ov.order_completion_time.min_hours.toFixed(1)}h · max {ov.order_completion_time.max_hours?.toFixed(1)}h
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Worker performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ov.worker_performance.length === 0 && <p className="text-sm text-muted-foreground">No commissions yet.</p>}
            {ov.worker_performance.map((w) => (
              <div key={w.worker} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{w.worker}</p>
                  <p className="text-xs text-muted-foreground">{w.jobs} jobs · {formatNaira(w.commission)} commission</p>
                </div>
                <span className="ml-2 shrink-0 font-semibold">{formatNaira(w.earned)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-4 w-4" /> Referral performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-3"><p className="text-xl font-bold">{ov.referral_performance.total_signups}</p><p className="text-xs text-muted-foreground">Signups</p></div>
              <div className="rounded-lg border p-3"><p className="text-xl font-bold">{ov.referral_performance.total_rewards}</p><p className="text-xs text-muted-foreground">Rewards</p></div>
              <div className="rounded-lg border p-3"><p className="text-xl font-bold">{formatNaira(ov.referral_performance.total_reward_value)}</p><p className="text-xs text-muted-foreground">Value paid</p></div>
            </div>
            {ov.referral_performance.top_referrers.map((t) => (
              <div key={t.referrer} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="truncate font-medium">{t.referrer}</span>
                <span className="text-xs text-muted-foreground">{t.signups} signups</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}