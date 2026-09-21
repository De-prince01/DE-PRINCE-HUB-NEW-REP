"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Notification[]>("/notifications");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* surface silently; next poll refreshes */
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative p-2 rounded-full hover:bg-[#222]"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D4A84B] px-1 text-[10px] font-bold text-[#0B0B0B]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 overflow-hidden rounded-xl border border-[#D4A84B]/20 bg-[#181818] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#D4A84B]/15 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-[#D4A84B]/20 px-2 py-0.5 text-xs text-[#E8C879]">
                  {unreadCount} new
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#E8C879] hover:text-[#F3D98F]"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              items.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    api(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
                    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
                  }}
                  className={`block w-full border-b border-[#D4A84B]/10 px-4 py-3 text-left transition-colors hover:bg-[#222] ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">{formatDate(n.created_at)}</p>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-[#D4A84B]/15 p-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-[#E8C879] transition-colors hover:bg-[#222]"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
