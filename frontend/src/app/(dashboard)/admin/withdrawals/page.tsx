"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Landmark, CheckCircle2, XCircle, RefreshCw, Clock, Banknote,
} from "lucide-react";

interface Withdrawal {
  id: string;
  reference: string;
  amount: number;
  user_id?: string;
  bank_code: string;
  account_number: string;
  account_name: string | null;
  status: string;
  gateway: string | null;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
}

interface Summary {
  pending_amount: number;
  completed_amount: number;
  counts: Record<string, number>;
}

export default function AdminWithdrawalsPage() {
  const [pending, setPending] = useState<Withdrawal[]>([]);
  const [all, setAll] = useState<Withdrawal[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, a, s] = await Promise.all([
        api<Withdrawal[]>("/admin/withdrawals/pending"),
        api<Withdrawal[]>("/admin/withdrawals"),
        api<Summary>("/admin/withdrawals/summary"),
      ]);
      setPending(p || []);
      setAll(a || []);
      setSummary(s);
    } catch {
      showToast.error("Failed to load withdrawals");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (w: Withdrawal, action: "approved" | "rejected") => {
    setBusy(w.id);
    try {
      await api(`/admin/withdrawals/${w.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: action, admin_note: note || null }),
      });
      showToast.success(action === "approved" ? "Withdrawal approved (transfer initiated)" : "Withdrawal rejected & refunded");
      setNote("");
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const complete = async (w: Withdrawal) => {
    setBusy(w.id);
    try {
      await api(`/admin/withdrawals/${w.id}/complete`, { method: "POST", body: "{}" });
      showToast.success("Marked as completed");
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const fail = async (w: Withdrawal) => {
    setBusy(w.id);
    try {
      await api(`/admin/withdrawals/${w.id}/fail`, { method: "POST", body: "{}" });
      showToast.success("Marked failed & wallet refunded");
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const refreshBanks = async () => {
    setRefreshing(true);
    try {
      const res = await api<any>("/admin/banks/refresh", { method: "POST", body: "{}" });
      showToast.success(`Banks updated (${res.total} total)`);
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const list = filter === "pending" ? pending : all.filter((w) => w.status === filter);

  const countBadge = (key: string) => summary?.counts[key] ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payout Approvals</h1>
          <p className="text-muted-foreground">Approve wallet withdrawals & pay out to bank accounts</p>
        </div>
        <Button variant="outline" onClick={refreshBanks} disabled={refreshing}>
          <RefreshCw className="mr-2 h-4 w-4" /> {refreshing ? "Updating..." : "Refresh Bank List"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="mt-1 text-xl font-bold">{countBadge("pending")}</p>
            <p className="text-xs text-muted-foreground">{formatNaira(summary?.pending_amount ?? 0)} awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Approved</span>
              <Banknote className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-1 text-xl font-bold">{countBadge("approved")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <p className="mt-1 text-xl font-bold">{countBadge("completed")}</p>
            <p className="text-xs text-muted-foreground">{formatNaira(summary?.completed_amount ?? 0)} paid out</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rejected</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-1 text-xl font-bold">{countBadge("rejected")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Withdrawal Requests</CardTitle>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No withdrawals in this state.</p>
          ) : (
            <div className="space-y-4">
              {list.map((w) => (
                <div key={w.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Landmark className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{w.account_name || "—"} · {formatNaira(w.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.reference} · {w.requested_at ? new Date(w.requested_at).toLocaleString() : "—"}
                        </p>
                        <p className="mt-1 text-xs">
                          Account: <span className="font-medium">{w.account_number}</span> (bank code {w.bank_code})
                          {w.gateway && <span className="ml-2 text-muted-foreground">via {w.gateway}</span>}
                        </p>
                        {w.admin_note && <p className="mt-1 text-xs text-muted-foreground">Note: {w.admin_note}</p>}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      { pending: "bg-yellow-100 text-yellow-700", processing: "bg-blue-100 text-blue-700",
                        approved: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700",
                        rejected: "bg-red-100 text-red-700", failed: "bg-red-100 text-red-700" }[w.status] || "bg-gray-100"
                    }`}>
                      {w.status.toUpperCase()}
                    </span>
                  </div>

                  {w.status === "pending" && (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Admin note (optional)"
                        rows={2}
                      />
                      <div className="flex gap-3">
                        <Button onClick={() => act(w, "approved")} disabled={busy === w.id} className="flex-1">
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve & Pay
                        </Button>
                        <Button onClick={() => act(w, "rejected")} disabled={busy === w.id} variant="destructive" className="flex-1">
                          <XCircle className="mr-2 h-4 w-4" /> Reject & Refund
                        </Button>
                      </div>
                    </div>
                  )}

                  {(w.status === "processing" || w.status === "approved") && (
                    <div className="mt-4 flex gap-3">
                      <Button onClick={() => complete(w)} disabled={busy === w.id} size="sm" className="flex-1">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
                      </Button>
                      <Button onClick={() => fail(w)} disabled={busy === w.id} size="sm" variant="destructive" className="flex-1">
                        <XCircle className="mr-2 h-4 w-4" /> Mark Failed (refund)
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}