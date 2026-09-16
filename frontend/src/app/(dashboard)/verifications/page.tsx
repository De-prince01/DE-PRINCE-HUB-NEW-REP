"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VerificationItem {
  id: string;
  reference: string;
  verification_type: string;
  entity_name?: string;
  status: string;
  status_message?: string;
  provider?: string;
  amount: number;
  is_paid: boolean;
  result?: any;
  requested_at: string;
  completed_at?: string;
}

interface VerificationList {
  items: VerificationItem[];
  total: number;
}

const TYPE_LABELS: Record<string, string> = {
  nin: "NIN (National ID)",
  bvn: "BVN (Bank Verification)",
  cac: "CAC Business",
  bank: "Bank Account",
  academic: "Academic Records",
  document: "Document",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-amber-500/10 text-amber-400",
  under_review: "bg-blue-500/10 text-blue-400",
  processing: "bg-blue-500/10 text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
  cancelled: "bg-[#A8A8A8]/10 text-[#A8A8A8]",
};

export default function VerificationsPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [vtype, setVtype] = useState("nin");
  const [entityName, setEntityName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const data = await api<VerificationList>("/verifications");
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) {
      showToast.error("Please enter the ID / reference number to verify");
      return;
    }
    setSubmitting(true);
    try {
      await api("/verifications", {
        method: "POST",
        body: JSON.stringify({
          verification_type: vtype,
          entity_name: entityName.trim() || undefined,
          id_number: idNumber.trim(),
        }),
      });
      showToast.success("Verification request submitted");
      setEntityName("");
      setIdNumber("");
      load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Verification Centre</h1>
        <p className="text-[#A8A8A8]">
          Request verification reports for NIN, BVN, CAC, bank and academic
          records. Each request gets a tracking reference.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#D4A84B]/25 bg-[#181818]">
          <CardHeader>
            <CardTitle className="text-white">New Verification Request</CardTitle>
            <CardDescription className="text-[#A8A8A8]">
              Results are produced by our verified provider pipeline — never generated or faked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label className="text-[#E8E8E8]">Verification Type</Label>
                <select
                  value={vtype}
                  onChange={(e) => setVtype(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-[#D4A84B]/30 bg-[#181818] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4A84B]"
                >
                  <option value="nin">NIN (National ID)</option>
                  <option value="bvn">BVN (Bank Verification Number)</option>
                  <option value="cac">CAC Business</option>
                  <option value="bank">Bank Account</option>
                  <option value="academic">Academic Records</option>
                  <option value="document">Document</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-[#E8E8E8]">Entity Name (optional)</Label>
                <Input
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Person, business or document name"
                />
              </div>
              <div>
                <Label className="text-[#E8E8E8]">ID / Reference Number</Label>
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. NIN, BVN or account number"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Request Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="rounded-xl border border-[#D4A84B]/25 bg-[#181818] p-4">
            <p className="font-semibold text-white">How verification works</p>
            <ul className="mt-2 space-y-2 text-sm text-[#A8A8A8]">
              <li><span className="text-[#E8C879]">1.</span> Submit the number / records to verify.</li>
              <li><span className="text-[#E8C879]">2.</span> Receive a DP-VER reference for tracking.</li>
              <li><span className="text-[#E8C879]">3.</span> Our verification desk processes it via the configured provider.</li>
              <li><span className="text-[#E8C879]">4.</span> Download the report when completed.</li>
            </ul>
            <p className="mt-3 text-xs text-[#A8A8A8]/70">
              We keep a compliance audit trail. Sensitive IDs are masked in your
              history and stored securely.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">Your Requests</h2>
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4A84B] border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D4A84B]/30 py-10 text-center text-[#A8A8A8]">
              No verification requests yet. Use the form to start one.
            </div>
          ) : (
            items.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4A84B]/25 bg-[#181818] p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-[#E8C879]">
                      {v.reference}
                    </p>
                    <Badge className={STATUS_STYLES[v.status] || STATUS_STYLES.submitted}>
                      {v.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-white">
                    {TYPE_LABELS[v.verification_type] || v.verification_type}
                    {v.entity_name ? ` · ${v.entity_name}` : ""}
                  </p>
                  <p className="text-xs text-[#A8A8A8]">
                    {formatDate(v.requested_at)}
                    {v.amount > 0 ? ` · ${formatNaira(v.amount)}` : ""}
                  </p>
                </div>
                {v.result ? (
                  <Badge variant="success">
                    {v.result.verified ? "Verified" : "Failed"}
                  </Badge>
                ) : (
                  <span className="text-xs text-[#A8A8A8]">{v.provider || "Pending"}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}