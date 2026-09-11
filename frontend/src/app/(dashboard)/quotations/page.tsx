"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, FilePenLine } from "lucide-react";
import type { QuotationRequestItem, Quotation } from "@/types";

export default function QuotationsPage() {
  const [requests, setRequests] = useState<QuotationRequestItem[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [svcId, setSvcId] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyQuote, setBusyQuote] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, qs, svs] = await Promise.all([
        api<QuotationRequestItem[]>("/quotations/requests"),
        api<Quotation[]>("/quotations"),
        api<any[]>("/services"),
      ]);
      setRequests(reqs || []);
      setQuotes(qs || []);
      setServices(svs || []);
    } catch {
      setRequests([]);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitRequest = async () => {
    if (!svcId) {
      showToast.error("Select a service");
      return;
    }
    setSubmitting(true);
    try {
      await api("/quotations/requests", {
        method: "POST",
        body: JSON.stringify({
          service_id: svcId,
          description: description || null,
          budget: budget ? parseFloat(budget) : null,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      });
      showToast.success("Quote requested");
      setSvcId("");
      setDescription("");
      setBudget("");
      setDeadline("");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to request quote");
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (id: string, action: "accept" | "reject" | "change") => {
    setBusyQuote(id);
    try {
      await api(`/quotations/${id}/${action === "accept" ? "accept" : action === "reject" ? "reject" : "change"}`, {
        method: "POST",
        body: "{}",
      });
      showToast.success(action === "accept" ? "Quotation accepted — order created" : `Quotation ${action}d`);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Action failed");
    } finally {
      setBusyQuote(null);
    }
  };

  const statusBadge: Record<string, string> = {
    open: "outline", quoted: "info", quoted_pending: "info",
    accepted: "success", rejected: "destructive", request_change: "warning",
    cancelled: "destructive", pending: "info", change_requested: "warning",
    superseded: "secondary", delivered: "secondary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-muted-foreground">Request quotes & review offers</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <FilePenLine className="mr-2 h-4 w-4" /> Request quote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a quotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Service</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={svcId} onChange={(e) => setSvcId(e.target.value)}>
                  <option value="">Select service…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you need…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Budget (₦)</Label>
                  <Input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="Optional" />
                </div>
                <div>
                  <Label>Deadline</Label>
                  <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={submitRequest} disabled={submitting}>
                {submitting ? "Requesting…" : "Submit request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My quote requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="h-16 animate-pulse" />
            ) : requests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No quote requests yet.</p>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{r.service_name || "General"} · {r.request_number}</p>
                    <Badge variant={(statusBadge[r.status] || "outline") as any}>{r.status.replace(/_/g, " ")}</Badge>
                  </div>
                  {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.budget ? `Budget ${formatNaira(r.budget)} · ` : ""}
                    {formatDate(r.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="h-16 animate-pulse" />
            ) : quotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No quotations yet.</p>
            ) : (
              quotes.map((q) => (
                <div key={q.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{q.service_name || q.quotation_number}</p>
                    <Badge variant={(statusBadge[q.status] || "outline") as any}>{q.status.replace(/_/g, " ")}</Badge>
                  </div>
                  {q.note && <p className="mt-1 text-sm text-muted-foreground">{q.note}</p>}
                  <div className="mt-2 space-y-1">
                    {q.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <span>{it.title} × {it.quantity}</span>
                        <span>{formatNaira(it.total_price)}</span>
                      </div>
                    ))}
                    {q.discount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground"><span>Discount</span><span>-{formatNaira(q.discount)}</span></div>
                    )}
                    {q.delivery_fee > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground"><span>Delivery</span><span>{formatNaira(q.delivery_fee)}</span></div>
                    )}
                    {q.tax > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span>{formatNaira(q.tax)}</span></div>
                    )}
                    <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatNaira(q.total)}</span></div>
                  </div>
                  {q.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => act(q.id, "accept")} disabled={busyQuote === q.id}>
                        <Check className="mr-1 h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(q.id, "change")} disabled={busyQuote === q.id}>
                        Request change
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(q.id, "reject")} disabled={busyQuote === q.id}>
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                  {q.order_number && <p className="mt-2 text-xs text-primary">Order created: {q.order_number}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}