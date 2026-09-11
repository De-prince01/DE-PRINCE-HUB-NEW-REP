"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Gift, Loader2, Users, Wallet } from "lucide-react";
import type { MyReferral } from "@/types";

export default function ReferralsPage() {
  const [data, setData] = useState<MyReferral | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api<MyReferral>("/referrals/my"));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copyCode = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      showToast.success("Referral code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error("Could not copy code");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-muted-foreground">Share your code — earn rewards when referred customers place orders</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Your code</CardTitle>
            <Gift className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 animate-pulse" />
            ) : data ? (
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold">{data.code}</span>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  {copied ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="mr-1 h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Signups</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "…" : data?.signups ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total rewards</CardTitle>
            <Wallet className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "…" : formatNaira(data?.rewards_total ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rewards history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="h-16 animate-pulse" />
          ) : !data || data.rewards.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No rewards yet. Share your code and earn when your referrals order.
            </p>
          ) : (
            data.rewards.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4">
                <div>
                  <p className="font-medium">{r.order_number ? `Order ${r.order_number}` : "Referral reward"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.reward_type.toUpperCase()} reward · {formatDate(r.created_at)} · {r.status}
                  </p>
                </div>
                <Badge variant="success">+{formatNaira(r.amount)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}