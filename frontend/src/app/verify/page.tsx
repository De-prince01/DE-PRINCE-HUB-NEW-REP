"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldX, ScrollText } from "lucide-react";

interface VerifyResponse {
  valid: boolean;
  business?: string;
  receipt_number?: string;
  order_number?: string | null;
  total?: number;
  issued_at?: string;
  message?: string;
}

function VerifyPage() {
  const searchParams = useSearchParams();
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async (n: string) => {
    if (!n.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api<VerifyResponse>(
        `/receipts/verify/${encodeURIComponent(n.trim())}`,
        { auth: false }
      );
      setResult(res);
      if (!res.valid) setError("This receipt number could not be found.");
    } catch (e: any) {
      setError(e.message || "Could not check the receipt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const n = searchParams.get("n");
    if (n) {
      setNumber(n);
      check(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
            <img
              src="/assets/logo-mark.svg"
              alt="DE-PRINCE DIGITAL HUB"
              width="72"
              height="72"
              className="h-14 w-14"
            />
          </div>
          <h1 className="mt-3 text-2xl font-bold">Receipt Verification</h1>
          <p className="text-muted-foreground">DE-PRINCE DIGITAL HUB</p>
        </div>

        <Card>
          <CardContent className="space-y-3 p-5">
            <Label htmlFor="num">Receipt number</Label>
            <div className="flex gap-2">
              <Input
                id="num"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. RCP-2026…"
              />
              <Button onClick={() => check(number)} disabled={loading}>
                {loading ? "Checking…" : "Check"}
              </Button>
            </div>
            {error && !result?.valid && (
              <p className="text-sm text-red-600">{result ? "This receipt number could not be found." : error}</p>
            )}

            {result && (
              <div
                className={
                  "flex items-start gap-3 rounded-lg border p-4 " +
                  (result.valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")
                }
              >
                {result.valid ? (
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-green-700" />
                ) : (
                  <ShieldX className="mt-0.5 h-6 w-6 shrink-0 text-red-700" />
                )}
                <div className="text-sm">
                  <p className={"font-semibold " + (result.valid ? "text-green-700" : "text-red-700")}>
                    {result.valid ? "Verified — genuine receipt" : "Not found"}
                  </p>
                  {result.valid && (
                    <div className="mt-2 space-y-1 text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <ScrollText className="h-4 w-4" /> {result.receipt_number}
                      </p>
                      {result.order_number && <p>Order: {result.order_number}</p>}
                      {result.total !== undefined && (
                        <p className="text-foreground font-medium">Total: {formatNaira(result.total)}</p>
                      )}
                      {result.business && <p>{result.business}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPageEntry() {
  return (
    <Suspense fallback={null}>
      <VerifyPage />
    </Suspense>
  );
}
