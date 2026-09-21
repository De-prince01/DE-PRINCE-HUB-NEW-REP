"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Package,
  LifeBuoy,
  Send,
  Paperclip,
  Inbox,
  Loader2,
  CircleDot,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatNaira } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OrderHead {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

interface TicketHead {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
}

interface ThreadMsg {
  id: string;
  sender_id: string | null;
  text: string;
  created_at: string;
}

interface ActiveThread {
  kind: "order" | "ticket";
  id: string;
  label: string;
}

export default function MessagesPage() {
  const [orders, setOrders] = useState<OrderHead[]>([]);
  const [tickets, setTickets] = useState<TicketHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveThread | null>(null);
  const [msgs, setMsgs] = useState<ThreadMsg[]>([]);
  const [activeLoading, setActiveLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [threadErr, setThreadErr] = useState<string | null>(null);
  const [sendText, setSendText] = useState("");
  const [sendFile, setSendFile] = useState<File | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async (kind: ActiveThread["kind"], id: string) => {
    setActiveLoading(true);
    setThreadErr(null);
    try {
      const base = kind === "order" ? `/orders/${id}/messages` : `/support/tickets/${id}/messages`;
      const raw = await api<Record<string, unknown>[]>(base);
      const arr = Array.isArray(raw) ? raw : [];
      setMsgs(
        arr.map((m) => ({
          id: String(m.id ?? ""),
          sender_id: m.sender_id ? String(m.sender_id) : null,
          text: String(m.message ?? m.body ?? ""),
          created_at: String(m.created_at ?? ""),
        }))
      );
    } catch {
      setMsgs([]);
      setThreadErr("Couldn't load this thread. It may not be available for your account yet.");
    } finally {
      setActiveLoading(false);
    }
  }, []);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [o, t] = await Promise.all([
          api<OrderHead[]>("/orders"),
          api<TicketHead[]>("/support/tickets"),
        ]);
        if (!on) return;
        setOrders(Array.isArray(o) ? o : []);
        setTickets(Array.isArray(t) ? t : []);
      } catch {
        // threads either load or the empty state is shown honestly
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    if (active) loadThread(active.kind, active.id);
  }, [active, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, active]);

  const openThread = (kind: ActiveThread["kind"], id: string, label: string) => {
    setActive({ kind, id, label });
  };

  const sendMsg = async () => {
    if (!active || (!sendText.trim() && !sendFile)) return;
    setSending(true);
    try {
      const base =
        active.kind === "order" ? `/orders/${active.id}` : `/support/tickets/${active.id}`;
      const form = new FormData();
      if (sendText.trim()) form.append(active.kind === "order" ? "message" : "body", sendText.trim());
      if (sendFile) form.append("file", sendFile);

      await api(`${base}/messages`, {
        method: "POST",
        body: form,
        headers: {},
      });
      setSendText("");
      setSendFile(null);
      await loadThread(active.kind, active.id);
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } catch {
      setThreadErr("Message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Chat with our team about active orders, or reply to support tickets.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* ---------- LEFT: thread list ---------- */}
        <Card>
          <CardContent className="p-2">
            <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-[#E8C879]">
              Order threads
            </p>
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
            ) : orders.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Package className="mx-auto h-6 w-6 text-muted-foreground/25" />
                <p className="mt-2 text-xs text-muted-foreground">
                  No orders yet.{" "}
                  <Link href="/use" className="text-[#E8C879] hover:underline">
                    Start one
                  </Link>{" "}
                  to open a thread.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => openThread("order", o.id, `Order ${o.order_number}`)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                      active?.kind === "order" && active.id === o.id
                        ? "bg-[#1E1E1E] text-white"
                        : "hover:bg-[#191919]"
                    )}
                  >
                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A84B]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Order {o.order_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.status.replace("_", " ")} · {formatNaira(o.total)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/60">
                      {formatDate(o.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="px-3 pb-2 pt-4 text-xs font-medium uppercase tracking-wider text-[#E8C879]">
              Support tickets
            </p>
            {loading ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : tickets.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <LifeBuoy className="mx-auto h-6 w-6 text-muted-foreground/25" />
                <p className="mt-2 text-xs text-muted-foreground">
                  No tickets yet.{" "}
                  <Link href="/support" className="text-[#E8C879] hover:underline">
                    Open one
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openThread("ticket", t.id, t.subject)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                      active?.kind === "ticket" && active.id === t.id
                        ? "bg-[#1E1E1E] text-white"
                        : "hover:bg-[#191919]"
                    )}
                  >
                    <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A84B]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.priority} priority · {t.status.replace("_", " ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------- RIGHT: thread pane ---------- */}
        <Card>
          {!active ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                Pick an order or support ticket to open its conversation.
              </p>
              <p className="max-w-sm text-xs text-muted-foreground/60">
                Every order has its own thread so you can ask about that specific job. Replies
                from the DE-PRINCE team appear here automatically.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col">
              <div className="flex items-center justify-between border-b border-[#D4A84B]/15 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{active.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.kind === "order" ? "Order conversation" : "Support conversation"}
                  </p>
                </div>
                <Link
                  href={active.kind === "order" ? "/orders" : "/support"}
                  className="text-xs text-[#E8C879] hover:underline"
                >
                  View details
                </Link>
              </div>

              <div className="max-h-[380px] flex-1 space-y-3 overflow-y-auto p-4">
                {activeLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                  </div>
                ) : msgs.length === 0 ? (
                  <div className="py-10 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/25" />
                    <p className="mt-3 text-sm text-muted-foreground">No messages yet.</p>
                    <p className="text-xs text-muted-foreground/60">
                      Say hello — the team will reply here.
                    </p>
                  </div>
                ) : (
                  msgs.map((m) => {
                    const isMine = !m.sender_id;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex items-end gap-2", isMine ? "justify-end" : "justify-start")}
                      >
                        {!isMine && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A84B]/15">
                            <User className="h-3 w-3 text-[#E8C879]" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                            isMine
                              ? "rounded-br-sm bg-[#D4A84B] text-[#0B0B0B]"
                              : "rounded-bl-sm bg-[#1E1E1E] text-white"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/60">
                            {formatDate(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              {threadErr && (
                <p className="border-t border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-400">
                  {threadErr}
                </p>
              )}

              <div className="border-t border-[#D4A84B]/15 p-3">
                <div className="flex items-center gap-2">
                  <label
                    className="cursor-pointer rounded-lg border border-[#D4A84B]/25 p-2 text-muted-foreground hover:bg-[#1E1E1E]"
                    title="Attach a file"
                  >
                    <Paperclip className="h-4 w-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.zip"
                      onChange={(e) => setSendFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <Input
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMsg();
                      }
                    }}
                    placeholder={
                      active.kind === "order"
                        ? "Message about this order…"
                        : "Reply to this ticket…"
                    }
                    className="border-[#D4A84B]/25"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={sendMsg}
                    disabled={sending || (!sendText.trim() && !sendFile)}
                    className="h-9 w-9 shrink-0 bg-[#D4A84B] text-[#0B0B0B] hover:bg-[#E8C879]"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {sendFile && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <CircleDot className="mr-1 inline h-3 w-3 text-[#E8C879]" />
                    {sendFile.name}
                    <button
                      type="button"
                      className="ml-2 text-muted-foreground/60 hover:text-white"
                      onClick={() => setSendFile(null)}
                    >
                      remove
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
