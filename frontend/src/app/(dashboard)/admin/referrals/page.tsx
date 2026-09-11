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
import { Loader2 } from "lucide-react";
import type { ReferralProgram, ReferralReward, ReferralSignup } from "@/types";

export default function AdminReferralsPage() {
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [signups, setSignups] = useState<ReferralSignup[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string; base_price?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isActive, setIsActive] = useState(false);
  const [rewardType, setRewardType] = useState("fixed");
  const [rewardValue, setRewardValue] = useState("200");
  const [minOrder, setMinOrder] = useState("0");
  const [maxReward, setMaxReward] = useState("");
  const [eligible, setEligible] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [pr, rw, sg, sv] = await Promise.all([
        api<ReferralProgram>("/referrals/program"),
        api<ReferralReward[]>("/referrals/rewards"),
        api<ReferralSignup[]>("/referrals/signups"),
        api<Array<{ id: string; name: string; base_price?: number }>>("/services"),
      ]);
      setProgram(pr || null);
      setRewards(rw || []);
      setSignups(sg || []);
      setServices(sv || []);
      if (pr) {
        setIsActive(pr.is_active);
        setRewardType(pr.reward_type);
        setRewardValue(String(pr.reward_value));
        setMinOrder(String(pr.minimum_order_amount));
        setMaxReward(pr.maximum_reward != null ? String(pr.maximum_reward) : "");
        setEligible(pr.eligible_service_ids || []);
      }
    } catch {
      setRewards([]);
      setSignups([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEligible = (id: string) => {
    setEligible((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    setSaving(true);
    try {
      const body: any = {
        is_active: isActive,
        reward_type: rewardType,
        reward_value: parseFloat(rewardValue) || 0,
        minimum_order_amount: parseFloat(minOrder) || 0,
      };
      if (maxReward !== "") body.maximum_reward = parseFloat(maxReward) || null;
      body.eligible_service_ids = eligible;
      await api("/referrals/program", { method: "PUT", body: JSON.stringify(body) });
      showToast.success("Program settings saved");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-muted-foreground">Referral program configuration, rewards and signups</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="h-16 animate-pulse" />
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Program active
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <Label>Reward type</Label>
                  <select value={rewardType} onChange={(e) => setRewardType(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                    <option value="fixed">Fixed (₦)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <Label>{rewardType === "percentage" ? "Reward (%)" : "Reward (₦)"}</Label>
                  <Input value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} inputMode="decimal" className="mt-1" />
                </div>
                <div>
                  <Label>Min order (₦)</Label>
                  <Input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} inputMode="decimal" className="mt-1" />
                </div>
                <div>
                  <Label>Max reward (₦, optional)</Label>
                  <Input value={maxReward} onChange={(e) => setMaxReward(e.target.value)} inputMode="decimal" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Eligible services (leave empty = all services)</Label>
                <div className="mt-1 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border p-2">
                  {services.length === 0 && <p className="text-xs text-muted-foreground">No services found.</p>}
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleEligible(s.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${eligible.includes(s.id) ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
              </Button>
              {program && (
                <p className="text-xs text-muted-foreground">
                  Last updated {program.updated_at ? formatDate(program.updated_at) : "—"}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rewards.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No rewards yet.</p>
            ) : (
              rewards.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{r.order_number ? `Order ${r.order_number}` : r.order_id}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.created_at)} · {r.reward_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatNaira(r.amount)}</span>
                    <Badge variant={r.status === "earned" ? "success" : "secondary"}>{r.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {signups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No signups yet.</p>
            ) : (
              signups.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{s.referred_name || s.referred_user_id}</p>
                    <p className="text-xs text-muted-foreground">Used code {s.code}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(s.referred_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}