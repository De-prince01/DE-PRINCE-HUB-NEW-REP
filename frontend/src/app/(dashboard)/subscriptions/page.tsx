"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Pause, Play, X, RefreshCw, Loader2 } from "lucide-react";
import type { SubscriptionPlan, Subscription } from "@/types";

const cycleLabel: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const statusBadge: Record<string, string> = {
  active: "success",
  paused: "warning",
  cancelled: "destructive",
  expired: "secondary",
};

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pl, sb] = await Promise.all([
        api<SubscriptionPlan[]>("/subscriptions/plans"),
        api<Subscription[]>("/subscriptions"),
      ]);
      setPlans(pl || []);
      setSubs(sb || []);
    } catch {
      setPlans([]);
      setSubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: "cancel" | "pause" | "resume") => {
    setBusy(id);
    try {
      await api(`/subscriptions/${id}/${action}`, { method: "PATCH", body: "{}" });
      showToast.success(`Subscription ${action}d`);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const subscribe = async (planId: string) => {
    setBusy(`p-${planId}`);
    try {
      await api("/subscriptions/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId, auto_renew: true }),
      });
      showToast.success("Subscribed");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to subscribe");
    } finally {
      setBusy(null);
    }
  };

  const renew = async (id: string) => {
    setBusy(id);
    try {
      await api(`/subscriptions/${id}/renew`, { method: "POST" });
      showToast.success("Renewal processed");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Renewal failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">Recurring services — monthly, quarterly or yearly</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available plans</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-16 animate-pulse" />
          ) : plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No subscription plans available yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-lg border p-4">
                  <p className="font-semibold">{plan.name}</p>
                  {plan.description && <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>}
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl font-bold">{formatNaira(plan.amount)}</span>
                    <span className="text-xs text-muted-foreground">/ {cycleLabel[plan.billing_cycle] || plan.billing_cycle}</span>
                  </div>
                  <Button size="sm" className="mt-3 w-full" onClick={() => subscribe(plan.id)} disabled={busy === `p-${plan.id}`}>
                    {busy === `p-${plan.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                    Subscribe
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="h-16 animate-pulse" />
          ) : subs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">You have no subscriptions.</p>
          ) : (
            subs.map((s) => (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.plan_name || "Subscription"} · {s.subscription_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {cycleLabel[s.billing_cycle] || s.billing_cycle} · {formatNaira(s.amount)}/cycle · Started {formatDate(s.start_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(statusBadge[s.status] || "outline") as any}>{s.service_status} · {s.status}</Badge>
                    {s.status === "active" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => act(s.id, "pause")} disabled={busy === s.id}>
                          <Pause className="mr-1 h-3 w-3" /> Pause
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => act(s.id, "cancel")} disabled={busy === s.id}>
                          <X className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                      </>
                    )}
                    {s.status === "paused" && (
                      <Button size="sm" variant="outline" onClick={() => act(s.id, "resume")} disabled={busy === s.id}>
                        <Play className="mr-1 h-3 w-3" /> Resume
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Next billing</p>
                    <p>{formatDate(s.next_billing_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Auto-renew</p>
                    <p>{s.auto_renew ? "On" : "Off"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Renewals</p>
                    <p>{s.renewal_count}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Last billed: {s.last_billed_at ? formatDate(s.last_billed_at) : "never"}</div>
                {s.renewals.length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    {s.renewals.map((ren) => (
                      <div key={ren.id} className="flex justify-between text-xs">
                        <span>{formatDate(ren.cycle_start)} → {formatDate(ren.cycle_end)}</span>
                        <span>{formatNaira(ren.amount)} · {ren.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}