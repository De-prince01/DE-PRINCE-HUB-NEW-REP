"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, Loader2, ScrollText } from "lucide-react";
import type { IdentityVerifyResult, IdentityRecord } from "@/types";

const ID_TYPES = ["NIN", "BVN", "SNIN"] as const;

export default function AdminIdentityPage() {
  const [idType, setIdType] = useState<string>("NIN");
  const [idNumber, setIdNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<IdentityVerifyResult | null>(null);

  const [records, setRecords] = useState<IdentityRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const loadRecords = async () => {
    setLoadingRecords(true);
    try {
      setRecords((await api<IdentityRecord[]>("/identity/records")) || []);
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const verify = async () => {
    if (!idNumber || idNumber.length < 4) {
      showToast.error("Enter a valid identity number");
      return;
    }
    setVerifying(true);
    setResult(null);
    try {
      const res = await api<IdentityVerifyResult>("/identity/verify", {
        method: "POST",
        body: JSON.stringify({
          id_type: idType,
          id_number: idNumber,
          customer_id: customerId || undefined,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
        }),
      });
      setResult(res);
      showToast.success(res.verified ? "Identity verified" : "Identity NOT verified");
      await loadRecords();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identity Verification</h1>
        <p className="text-muted-foreground">
          Verify customer NIN / BVN / SNIN documents (admin only)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Verify a document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Document type</Label>
                <Select value={idType} onValueChange={setIdType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ID number</Label>
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 12345678901"
                />
              </div>
            </div>
            <div>
              <Label>Customer ID (optional)</Label>
              <Input
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="UUID of the customer being verified"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name (optional)</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last name (optional)</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <Button onClick={verify} disabled={verifying} className="w-full">
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Verify
                </>
              )}
            </Button>

            {result && (
              <div
                className={
                  "mt-2 rounded-lg border p-4 " +
                  (result.verified ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")
                }
              >
                <div className="flex items-center gap-2">
                  {result.verified ? (
                    <ShieldCheck className="h-5 w-5 text-green-700" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-red-700" />
                  )}
                  <p className={"font-semibold " + (result.verified ? "text-green-700" : "text-red-700")}>
                    {result.verified ? "Verified" : "Not verified"}
                  </p>
                  <Badge variant="outline" className="ml-auto capitalize">
                    {result.provider}
                  </Badge>
                </div>
                <p className="mt-2 text-sm">{result.message}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span> {result.id_type}
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID:</span> {result.masked_id}
                  </div>
                  {result.full_name && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Name:</span> {result.full_name}
                    </div>
                  )}
                  {result.date_of_birth && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">D.O.B:</span> {result.date_of_birth}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" /> Verification records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <p className="py-6 text-center text-muted-foreground">Loading…</p>
            ) : records.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No verification records yet.</p>
            ) : (
              <div className="max-h-[480px] space-y-2 overflow-auto">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{r.service_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                        {r.provider ? ` · provider: ${r.provider}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{r.retention_days}d retention</p>
                      <p>customer {(r.customer_id || "").slice(0, 8) || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
