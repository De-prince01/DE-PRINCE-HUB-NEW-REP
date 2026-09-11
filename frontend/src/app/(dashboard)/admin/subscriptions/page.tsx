"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import type { SubscriptionPlan, Subscription } from "@/types";

const cycleLabel: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [isActive, setIsActive] = useState(true);

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

  const createPlan = async () => {
    if (!name.trim() || !amount) {
      showToast.error("Plan name and amount are required");
      return;
    }
    setSubmitting(true);
    try {
      await api("/subscriptions/plans", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(), description: description || null,
          billing_cycle: billingCycle, amount: parseFloat(amount),
          is_active: isActive,
        }),
      });
      showToast.success("Plan created");
      setName(""); setDescription(""); setAmount(""); setBillingCycle("monthly"); setIsActive(true);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to create plan");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlan = async (plan: SubscriptionPlan) => {
    setBusy(`pl-${plan.id}`);
    try {
      await api(`/subscriptions/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...plan, is_active: !plan.is_active }),
      });
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const forceRenew = async (id: string) => {
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

  const badge: Record<string, string> = {
    active: "success", paused: "warning", cancelled: "destructive", expired: "secondary",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">Recurring plans, renewals and service status</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Subscription plans</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-3 w-3" /> New plan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create subscription plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Plan name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Maintenance" className="mt-1" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount (₦)</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1" />
                  </div>
                  <div>
                    <Label>Billing cycle</Label>
                    <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Active (visible to customers)
                </label>
                <Button className="w-full" onClick={createPlan} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create plan"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="h-16 animate-pulse" />
          ) : plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No plans yet.</p>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{formatNaira(plan.amount)} / {cycleLabel[plan.billing_cycle] || plan.billing_cycle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={plan.is_active ? "success" : "secondary"}>{plan.is_active ? "active" : "inactive"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => togglePlan(plan)} disabled={busy === `pl-${plan.id}`}>
                    {plan.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No subscriptions yet.</p>
          ) : (
            subs.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.plan_name || "Subscription"} · {s.subscription_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.customer_name || s.customer_id} · {cycleLabel[s.billing_cycle] || s.billing_cycle} · {formatNaira(s.amount)}/cycle
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(badge[s.status] || "outline") as any}>{s.status} · {s.service_status}</Badge>
                    {s.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => forceRenew(s.id)} disabled={busy === s.id}>
                        <Loader2 className={`mr-1 h-3 w-3 ${busy === s.id ? "animate-spin" : ""}`} /> Process renew
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Next: {formatDate(s.next_billing_date)}</span>
                  <span>Renewals: {s.renewal_count}</span>
                  <span>Auto-renew: {s.auto_renew ? "On" : "Off"}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}