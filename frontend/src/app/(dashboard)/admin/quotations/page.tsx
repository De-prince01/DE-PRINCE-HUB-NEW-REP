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
import { FilePlus2, Plus, Trash2, Loader2 } from "lucide-react";
import type { QuotationRequestItem, Quotation } from "@/types";

interface LineItem {
  title: string;
  quantity: number;
  unit_price: string;
}

export default function AdminQuotationsPage() {
  const [requests, setRequests] = useState<QuotationRequestItem[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // quote creation state
  const [createFor, setCreateFor] = useState<QuotationRequestItem | null>(null);
  const [note, setNote] = useState("");
  const [discount, setDiscount] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [tax, setTax] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ title: "", quantity: 1, unit_price: "" }]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, qs] = await Promise.all([
        api<QuotationRequestItem[]>("/quotations/requests"),
        api<Quotation[]>("/quotations"),
      ]);
      setRequests(reqs || []);
      setQuotes(qs || []);
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

  const resetForm = (r: QuotationRequestItem) => {
    setCreateFor(r);
    setNote("");
    setDiscount("");
    setDeliveryFee("");
    setTax("");
    setValidUntil("");
    setItems([{ title: "", quantity: 1, unit_price: "" }]);
  };

  const addItem = () => setItems((prev) => [...prev, { title: "", quantity: 1, unit_price: "" }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: string | number) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));

  const submitQuote = async () => {
    if (!createFor || submitting) return;
    const cleanItems = items.filter((it) => it.title.trim() && it.unit_price !== "");
    if (cleanItems.length === 0) {
      showToast.error("Add at least one line item with price");
      return;
    }
    setSubmitting(true);
    try {
      await api("/quotations", {
        method: "POST",
        body: JSON.stringify({
          request_id: createFor.id,
          note: note || null,
          discount: parseFloat(discount) || 0,
          delivery_fee: parseFloat(deliveryFee) || 0,
          tax: parseFloat(tax) || 0,
          valid_until: validUntil ? new Date(validUntil).toISOString() : null,
          items: cleanItems.map((it) => ({
            title: it.title.trim(), quantity: it.quantity, unit_price: parseFloat(it.unit_price),
          })),
        }),
      });
      showToast.success("Quotation issued");
      setCreateFor(null);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const badge: Record<string, string> = {
    open: "outline", quoted: "info", accepted: "success", rejected: "destructive",
    request_change: "warning", cancelled: "destructive", pending: "info",
    change_requested: "warning", superseded: "secondary",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quotations</h1>
        <p className="text-muted-foreground">Review requests and issue quotes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="h-24 animate-pulse" />
          ) : requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No quote requests.</p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.service_name || "General"} · {r.request_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.customer_name || r.customer_id} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(badge[r.status] || "outline") as any}>{r.status.replace(/_/g, " ")}</Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => resetForm(r)}>
                          <FilePlus2 className="mr-1 h-3 w-3" /> Create quotation
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Quotation for {r.service_name || "request"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                          <div className="space-y-2">
                            {items.map((it, idx) => (
                              <div key={idx} className="flex items-end gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs">Item title</Label>
                                  <Input value={it.title} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder="e.g. Design" />
                                </div>
                                <div className="w-16">
                                  <Label className="text-xs">Qty</Label>
                                  <Input value={it.quantity} type="number" min={1} onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))} />
                                </div>
                                <div className="w-24">
                                  <Label className="text-xs">Unit ₦</Label>
                                  <Input value={it.unit_price} inputMode="decimal" onChange={(e) => updateItem(idx, "unit_price", e.target.value)} />
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add line</Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-xs">Discount</Label><Input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" placeholder="0" /></div>
                            <div><Label className="text-xs">Delivery fee</Label><Input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} inputMode="decimal" placeholder="0" /></div>
                            <div><Label className="text-xs">Tax</Label><Input value={tax} onChange={(e) => setTax(e.target.value)} inputMode="decimal" placeholder="0" /></div>
                          </div>
                          <div>
                            <Label className="text-xs">Valid until</Label>
                            <Input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1" />
                          </div>
                          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to customer…" />
                          <Button className="w-full" onClick={submitQuote} disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue quotation"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issued quotations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quotes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No quotations issued.</p>
          ) : (
            quotes.map((q) => (
              <div key={q.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{q.service_name || q.quotation_number} · {q.quotation_number}</p>
                  <Badge variant={(badge[q.status] || "outline") as any}>{q.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="mt-1 space-y-1">
                  {q.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm"><span>{it.title} × {it.quantity}</span><span>{formatNaira(it.total_price)}</span></div>
                  ))}
                  <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatNaira(q.total)}</span></div>
                </div>
                {q.order_number && <p className="mt-1 text-xs text-primary">Order: {q.order_number}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}