"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Send } from "lucide-react";
import type { FAQ, SupportTicket } from "@/types";

const statusBadge: Record<string, string> = {
  open: "warning",
  in_progress: "info",
  waiting_customer: "secondary",
  resolved: "success",
  closed: "outline",
};

const statuses = ["open", "in_progress", "waiting_customer", "resolved", "closed"];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");

  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [faqCat, setFaqCat] = useState("general");
  const [addingFaq, setAddingFaq] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([
        api<SupportTicket[]>("/support/tickets" + (filter ? `?status=${filter}` : "")),
        api<FAQ[]>("/support/faqs"),
      ]);
      setTickets(t || []);
      setFaqs(f || []);
    } catch {
      setTickets([]);
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const openTicket = (t: SupportTicket) => {
    setSelected(t);
    setReply("");
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(`m-${selected.id}`);
    try {
      const updated = await api<SupportTicket>(`/support/tickets/${selected.id}/messages`, {
        method: "POST", body: JSON.stringify({ body: reply.trim() }),
      });
      setSelected(updated);
      setReply("");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Reply failed");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    setBusy(`s-${selected.id}-${status}`);
    try {
      const updated = await api<SupportTicket>(`/support/tickets/${selected.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      setSelected(updated);
      showToast.success(`Status → ${status}`);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Status update failed");
    } finally {
      setBusy(null);
    }
  };

  const decideRefund = async (decision: string) => {
    if (!selected) return;
    const amount = decision === "approved" && selected.refund_amount == null ? 0 : selected.refund_amount;
    setBusy(`rf-${selected.id}`);
    try {
      const updated = await api<SupportTicket>(`/support/tickets/${selected.id}/refund`, {
        method: "PATCH",
        body: JSON.stringify({ decision, amount: amount ?? 0 }),
      });
      setSelected(updated);
      showToast.success(`Refund ${decision}`);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Decision failed");
    } finally {
      setBusy(null);
    }
  };

  const addFaq = async () => {
    if (!q.trim() || !a.trim()) {
      showToast.error("Question and answer are required");
      return;
    }
    setAddingFaq(true);
    try {
      await api("/support/faqs", { method: "POST", body: JSON.stringify({ question: q.trim(), answer: a.trim(), category: faqCat, is_active: true }) });
      showToast.success("FAQ created");
      setQ(""); setA(""); setFaqCat("general");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to create FAQ");
    } finally {
      setAddingFaq(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Centre</h1>
        <p className="text-muted-foreground">Tickets, disputes, refunds, escalations and FAQs</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "" ? "default" : "outline"} onClick={() => setFilter("")}>All</Button>
        {statuses.map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tickets ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="h-16 animate-pulse" />
            ) : tickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No tickets.</p>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicket(t)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-primary/50 ${selected?.id === t.id ? "border-primary/60 bg-muted" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.customer_name || t.customer_id?.slice(0, 8)} · {t.ticket_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {t.is_escalated && <Badge variant="destructive">esc</Badge>}
                      <Badge variant={(statusBadge[t.status] || "outline") as any}>{t.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    {selected.subject} <span className="text-sm font-normal text-muted-foreground">· {selected.ticket_number}</span>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-1">
                    {selected.refund_decision && (
                      <Badge variant={selected.refund_decision === "approved" ? "success" : "destructive"}>
                        refund {selected.refund_decision}
                      </Badge>
                    )}
                    <Badge variant={(statusBadge[selected.status] || "outline") as any}>{selected.status.replace("_", " ")}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  {selected.category} · {selected.priority} priority · {selected.customer_name || selected.customer_id} ·
                  {selected.order_number ? <> order {selected.order_number}</> : null} · opened {formatDate(selected.created_at)}
                  {selected.is_escalated && <span className="ml-2 font-medium text-red-600">escalated{selected.escalation_reason ? `: ${selected.escalation_reason}` : ""}</span>}
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="mb-1 text-xs font-medium">{selected.customer_name || "Customer"} · {formatDate(selected.created_at)}</p>
                    <p>{selected.description}</p>
                  </div>
                  {selected.messages.map((m) => (
                    <div key={m.id} className={`rounded-md p-3 text-sm ${m.sender_role === "staff" ? "bg-primary/10" : "bg-muted"}`}>
                      <p className="mb-1 text-xs font-medium">{m.sender_name || (m.sender_role === "staff" ? "Support Team" : "Customer")} · {formatDate(m.created_at)}</p>
                      <p>{m.body}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Staff reply…" className="flex-1" rows={2} />
                  <Button onClick={sendReply} disabled={busy === `m-${selected.id}` || !reply.trim()}>
                    {busy === `m-${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                    Send
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <span className="text-xs text-muted-foreground">Transition to:</span>
                  {statuses.filter((s) => s !== selected.status).map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => setStatus(s)} disabled={busy === `s-${selected.id}-${s}`}>
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                  {selected.category === "refund_request" && !selected.refund_decision && (
                    <>
                      <Button size="sm" variant="default" onClick={() => decideRefund("approved")} disabled={busy === `rf-${selected.id}`}>
                        Approve refund
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decideRefund("denied")} disabled={busy === `rf-${selected.id}`}>
                        Deny refund
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent><p className="py-10 text-center text-sm text-muted-foreground">Select a ticket to view the thread.</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Manage FAQs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-lg border p-3">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question" />
                <Textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Answer" rows={2} />
                <div className="flex items-center gap-2">
                  <Input value={faqCat} onChange={(e) => setFaqCat(e.target.value)} placeholder="category" className="w-40" />
                  <Button size="sm" onClick={addFaq} disabled={addingFaq}>
                    {addingFaq ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />} Add FAQ
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {faqs.map((f) => (
                  <div key={f.id} className="rounded-md border p-2 text-sm">
                    <p className="font-medium">{f.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.answer}</p>
                    <p className="mt-1 text-xs">{f.category} · active: {f.is_active ? "yes" : "no"}</p>
                  </div>
                ))}
                {faqs.length === 0 && <p className="text-sm text-muted-foreground">No FAQs.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}