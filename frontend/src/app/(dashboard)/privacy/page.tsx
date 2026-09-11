"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/hooks/use-toast";
import { Lock, ShieldCheck, Download, Trash2, History } from "lucide-react";
import type { DataPurpose, DataConsent, PrivacyRequest, DataExport, AccessAuditEntry } from "@/types";

export default function PrivacyPage() {
  const [purposes, setPurposes] = useState<DataPurpose[]>([]);
  const [consents, setConsents] = useState<DataConsent[]>([]);
  const [audit, setAudit] = useState<AccessAuditEntry[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [exported, setExported] = useState<DataExport | null>(null);

  useEffect(() => {
    api<DataPurpose[]>("/privacy/purposes").then(setPurposes).catch(() => setPurposes([]));
    api<DataConsent[]>("/privacy/consents").then(setConsents).catch(() => setConsents([]));
    api<AccessAuditEntry[]>("/privacy/audit").then(setAudit).catch(() => setAudit([]));
    api<PrivacyRequest[]>("/privacy/requests").then(setRequests).catch(() => setRequests([]));
  }, []);

  const toggleConsent = async (purpose_code: string, granted: boolean) => {
    try {
      await api(`/privacy/consents/${purpose_code}`, { method: "PUT", body: JSON.stringify({ granted }) });
      setConsents((xs) => xs.map((c) => (c.purpose_code === purpose_code ? { ...c, granted } : c)));
      showToast.success(granted ? "Consent granted" : "Consent revoked");
    } catch (e: any) {
      showToast.error(e?.message ?? "Could not update consent");
    }
  };

  const exportData = async () => {
    try {
      setExported(await api<DataExport>("/privacy/export"));
      showToast.success("Data export ready");
    } catch (e: any) {
      showToast.error(e?.message ?? "Export failed");
    }
  };

  const requestDeletion = async () => {
    setDeleting(true);
    try {
      const r = await api<PrivacyRequest>("/privacy/requests", {
        method: "POST",
        body: JSON.stringify({ request_type: "data_deletion", reason: "Requested by account holder" }),
      });
      setRequests((xs) => [r, ...xs]);
      showToast.success("Deletion requested — our team will review it");
    } catch (e: any) {
      showToast.error(e?.message ?? "Could not request deletion");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="h-5 w-5" /> Privacy &amp; Your Data</h1>
        <p className="text-muted-foreground">We only collect what is needed for each service, and you can see exactly why.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Why we ask for your data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {purposes.map((p) => {
            const consent = consents.find((c) => c.purpose_code === p.purpose_code);
            const granted = consent?.granted ?? p.is_required;
            return (
              <div key={p.purpose_code} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.title}</p>
                    {p.is_required ? <Badge>Required</Badge> : <Badge variant="secondary">Optional</Badge>}
                    <span className="text-xs text-muted-foreground">kept {p.retention_days} days</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.data_collected.join(" · ")}</p>
                </div>
                <Button
                  size="sm"
                  variant={granted ? "default" : "outline"}
                  disabled={p.is_required}
                  onClick={() => toggleConsent(p.purpose_code, !granted)}
                >
                  {granted ? "Revoke" : "Allow"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Export my data</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">Download a copy of everything we store about you in a portable format.</p>
            <Button onClick={exportData}>Export my data</Button>
            {exported && (
              <div className="mt-3 overflow-x-auto rounded-lg border p-3">
                <pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(exported, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete my data</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Request deletion of your personal data. We keep only what the law requires (e.g. financial records).
            </p>
            <Button variant="destructive" disabled={deleting} onClick={requestDeletion}>
              {deleting ? "Requesting…" : "Request account & data deletion"}
            </Button>
            {requests.length > 0 && (
              <div className="mt-3 space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{r.request_type} · {r.request_number}</span>
                    <Badge variant={r.status === "pending" ? "secondary" : "default"}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Who accessed my data</CardTitle></CardHeader>
        <CardContent>
          {audit.length === 0 && <p className="text-sm text-muted-foreground">No sensitive-data access recorded yet.</p>}
          <div className="space-y-2">
            {audit.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">{a.action}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}