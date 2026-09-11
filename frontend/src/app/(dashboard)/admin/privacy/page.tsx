"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/hooks/use-toast";
import { Lock, ClipboardList, Eye, Trash2 } from "lucide-react";
import type { DataPurpose, PrivacyRequest, AccessAuditEntry } from "@/types";

export default function AdminPrivacyPage() {
  const [purposes, setPurposes] = useState<DataPurpose[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [audit, setAudit] = useState<AccessAuditEntry[]>([]);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    api<DataPurpose[]>("/privacy/purposes").then(setPurposes).catch(() => setPurposes([]));
    api<PrivacyRequest[]>("/privacy/requests").then(setRequests).catch(() => setRequests([]));
    api<AccessAuditEntry[]>("/privacy/audit").then(setAudit).catch(() => setAudit([]));
  };

  const setRetention = async (code: string, days: number) => {
    try {
      await api(`/privacy/purposes/${code}`, { method: "PATCH", body: JSON.stringify({ retention_days: days }) });
      setPurposes((xs) => xs.map((p) => (p.purpose_code === code ? { ...p, retention_days: days } : p)));
      showToast.success("Retention updated");
    } catch (e: any) {
      showToast.error(e?.message ?? "Update failed");
    }
  };

  const processRequest = async (id: string, action: "approve" | "deny") => {
    try {
      await api<PrivacyRequest>(`/privacy/requests/${id}/process`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      showToast.success(`Request ${action}d`);
      refresh();
    } catch (e: any) {
      showToast.error(e?.message ?? "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="h-5 w-5" /> Data Governance</h1>
        <p className="text-muted-foreground">Privacy purposes, retention, deletion requests and access audit.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Purpose registry &amp; retention policy</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {purposes.map((p) => (
            <div key={p.purpose_code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.title}</p>
                  {p.is_required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{p.purpose_code} · {p.data_collected.join(", ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setRetention(p.purpose_code, Math.max(7, p.retention_days - 30))}>−</Button>
                <span className="w-16 text-center text-sm tabular-nums">{p.retention_days}d</span>
                <Button size="sm" variant="outline" onClick={() => setRetention(p.purpose_code, p.retention_days + 30)}>＋</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Privacy requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
            {requests.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.request_type}</p>
                  <Badge variant={r.status === "pending" ? "secondary" : "default"}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.request_number} · {new Date(r.requested_at).toLocaleString()}</p>
                {r.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => processRequest(r.id, "approve")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => processRequest(r.id, "deny")}>Deny</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Sensitive-data access audit</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {audit.length === 0 && <p className="text-sm text-muted-foreground">No sensitive-data access recorded.</p>}
            {audit.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">{a.action}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}