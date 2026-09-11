"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Loader2, MessageSquarePlus, Send, ArrowUpRight, CheckCheck } from "lucide-react";
import type { FAQ, SupportTicket } from "@/types";

const statusBadge: Record<string, string> = {
  open: "warning",
  in_progress: "info",
  waiting_customer: "secondary",
  resolved: "success",
  closed: "outline",
};

const priorityClass: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const categoryLabel: Record<string, string> = {
  general: "General",
  order_dispute: "Order dispute",
  refund_request: "Refund request",
  escalation: "Escalation",
};

export default function SupportCenterPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [orderRef, setOrderRef] = useState("");

  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");

  const load = async () => {
    try {
      const [f, t] = await Promise.all([
        api<FAQ[]>("/support/faqs"),
        api<SupportTicket[]>("/support/tickets"),
      ]);
      setFaqs(f || []);
      setTickets(t || []);
    } catch {
      setFaqs([]);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openTicket = (t: SupportTicket) => {
    setSelected(t);
    setReply("");
  };

  const createTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      showToast.error("Subject and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const body: any = { subject: subject.trim(), category, priority, description: description.trim() };
      if (orderRef.trim()) body.order_id = orderRef.trim();
      const created = await api<SupportTicket>("/support/tickets", { method: "POST", body: JSON.stringify(body) });
      showToast.success(`Ticket ${created.ticket_number} created`);
      setSubject(""); setDescription(""); setOrderRef("");
      await load();
      setSelected(created);
    } catch (err: any) {
      showToast.error(err.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
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

  const escalate = async () => {
    if (!selected) return;
    setBusy(`e-${selected.id}`);
    try {
      const updated = await api<SupportTicket>(`/support/tickets/${selected.id}/escalate`, {
        method: "POST", body: "{}",
      });
      setSelected(updated);
      showToast.success("Ticket escalated");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Escalation failed");
    } finally {
      setBusy(null);
    }
  };

  const resolve = async () => {
    if (!selected) return;
    setBusy(`r-${selected.id}`);
    try {
      const updated = await api<SupportTicket>(`/support/tickets/${selected.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status: "resolved" }),
      });
      setSelected(updated);
      showToast.success("Ticket marked resolved");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Could not resolve");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Centre</h1>
        <p className="text-muted-foreground">FAQs, tickets, order disputes and refund requests</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Create ticket */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquarePlus className="h-4 w-4" /> Open a ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What can we help with?" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                  {Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            {(category === "order_dispute" || category === "refund_request") && (
              <div>
                <Label>Order ID (optional)</Label>
                <Input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="Paste your order id" className="mt-1" />
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={4} />
            </div>
            <Button className="w-full" onClick={createTicket} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit ticket"}
            </Button>
          </CardContent>
        </Card>

        {/* My tickets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="h-16 animate-pulse" />
            ) : tickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTicket(t)}
                  className="w-full rounded-lg border p-3 text-left transition hover:border-primary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.ticket_number} · {categoryLabel[t.category] || t.category} · {formatDate(t.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass[t.priority] || priorityClass.medium}`}>
                        {t.priority}
                      </span>
                      <Badge variant={(statusBadge[t.status] || "outline") as any}>{t.status.replace("_", " ")}</Badge>
                      {t.is_escalated && <Badge variant="destructive">escalated</Badge>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket detail */}
      {selected && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                {selected.subject} <span className="text-sm font-normal text-muted-foreground">· {selected.ticket_number}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={(statusBadge[selected.status] || "outline") as any}>{selected.status.replace("_", " ")}</Badge>
                {selected.refund_decision && (
                  <Badge variant={selected.refund_decision === "approved" ? "success" : "destructive"}>
                    refund {selected.refund_decision}
                    {selected.refund_amount != null ? ` · ${selected.refund_amount}` : ""}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {categoryLabel[selected.category]} · {selected.priority} priority
              {selected.order_number ? <> · order {selected.order_number}</> : null}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="mb-1 text-xs font-medium">You · {formatDate(selected.created_at)}</p>
                <p>{selected.description}</p>
              </div>
              {selected.messages.map((m) => (
                <div key={m.id} className={`rounded-md p-3 text-sm ${m.sender_role === "staff" ? "bg-primary/10" : "bg-muted"}`}>
                  <p className="mb-1 text-xs font-medium">
                    {m.sender_name || (m.sender_role === "staff" ? "Support Team" : "You")} · {formatDate(m.created_at)}
                  </p>
                  <p>{m.body}</p>
                </div>
              ))}
            </div>

            {selected.status !== "closed" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a message…" className="flex-1" rows={2} />
                <Button onClick={sendReply} disabled={busy === `m-${selected.id}` || !reply.trim()}>
                  {busy === `m-${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                  Send
                </Button>
              </div>
            )}

            {selected.status !== "closed" && selected.status !== "resolved" && (
              <div className="flex flex-wrap gap-2">
                {!selected.is_escalated && (
                  <Button size="sm" variant="outline" onClick={escalate} disabled={busy === `e-${selected.id}`}>
                    <ArrowUpRight className="mr-1 h-3 w-3" /> Escalate
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={resolve} disabled={busy === `r-${selected.id}`}>
                  <CheckCheck className="mr-1 h-3 w-3" /> Mark resolved
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Frequently asked questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="h-16 animate-pulse" />
          ) : faqs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No FAQs published yet.</p>
          ) : (
            faqs.map((f) => (
              <div key={f.id} className="rounded-lg border p-3">
                <p className="font-medium">{f.question}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.answer}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}