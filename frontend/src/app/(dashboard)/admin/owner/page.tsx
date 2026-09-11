"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Crown, Users, Wallet, ShoppingCart, CalendarClock, Printer, Monitor,
  Package, Truck, Bell, ScrollText, ShieldCheck, Landmark, BarChart3,
} from "lucide-react";
import type { OwnerDashboard, AuditLogEntry } from "@/types";

type UserRow = { id: string; email: string; first_name?: string; last_name?: string; role: string; is_active: boolean };

const COUNT_CARDS: { key: keyof OwnerDashboard["counts"]; label: string; icon: any }[] = [
  { key: "services_active", label: "Active services", icon: Landmark },
  { key: "service_categories", label: "Categories", icon: BarChart3 },
  { key: "customers", label: "Customers", icon: Users },
  { key: "staff", label: "Staff accounts", icon: ShieldCheck },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "pending_orders", label: "Pending orders", icon: ShoppingCart },
  { key: "appointments", label: "Appointments", icon: CalendarClock },
  { key: "print_jobs", label: "Print jobs", icon: Printer },
  { key: "computers", label: "Computers", icon: Monitor },
  { key: "inventory_items", label: "Inventory items", icon: Package },
  { key: "deliveries", label: "Deliveries", icon: Truck },
  { key: "branches", label: "Branches", icon: Landmark },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "audit_entries", label: "Audit entries", icon: ScrollText },
];

const ROLE_OPTIONS = [
  "customer", "staff", "manager", "admin", "printing_operator",
  "graphic_designer", "web_developer", "worker", "business_owner",
];

export default function OwnerPage() {
  const { user } = useAuth();
  const [dash, setDash] = useState<OwnerDashboard | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState("");

  const canOwner = user && (user.role === "super_admin" || user.role === "business_owner");

  const loadLogs = (p: number, action = actionFilter) => {
    api<{ total: number; entries: AuditLogEntry[] }>(
      `/owner/audit-logs?limit=20&offset=${p * 20}${action ? `&action=${encodeURIComponent(action)}` : ""}`
    ).then((r) => { setLogs(r.entries); setLogTotal(r.total); }).catch(() => { setLogs([]); setLogTotal(0); });
  };

  const loadUsers = () => {
    api<UserRow[]>("/admin/users").then(setUsers).catch(() => setUsers([]));
  };

  useEffect(() => {
    if (!canOwner) return;
    api<OwnerDashboard>("/owner/dashboard").then(setDash).catch(() => setDash(null));
    loadLogs(0);
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOwner]);

  const changeRole = async (id: string, role: string) => {
    setBusy(id + ":role");
    try {
      await api(`/owner/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      showToast.success(`Role updated to ${role}`);
      await api<OwnerDashboard>("/owner/dashboard").then(setDash);
    } catch (e: any) {
      showToast.error(e?.message ?? "Role update failed");
    } finally {
      setBusy("");
      loadUsers();
    }
  };

  const toggleStatus = async (u: UserRow) => {
    setBusy(u.id + ":status");
    try {
      await api(`/owner/users/${u.id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) });
      showToast.success(u.is_active ? "Account deactivated" : "Account activated");
    } catch (e: any) {
      showToast.error(e?.message ?? "Status update failed");
    } finally {
      setBusy("");
      loadUsers();
    }
  };

  if (!canOwner) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Owner access only.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-5 w-5" /> Owner Control</h1>
        <p className="text-muted-foreground">The whole business operation from one place.</p>
      </div>

      {dash && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid revenue</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-primary">{formatNaira(dash.money.paid_revenue)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-rose-600">{formatNaira(dash.money.expenses)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Profit</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${dash.money.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatNaira(dash.money.profit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Customer wallets (held)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold"><Wallet className="mr-1 inline h-5 w-5 text-muted-foreground" />{formatNaira(dash.money.wallet_balances_total)}</p></CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {COUNT_CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.key}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Icon className="h-8 w-8 shrink-0 text-primary" />
                    <div>
                      <p className="text-xl font-bold">{dash.counts[c.key]}</p>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Branches</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {dash.branches.map((b) => (
                  <div key={b.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{b.name}</p>
                    {b.address && <p className="text-muted-foreground">{b.address}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Recent activity</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {dash.recent_audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  dash.recent_audit.map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                      <span className="font-medium">{a.action}</span>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Audit trail ({logTotal})</span>
            <div className="flex gap-2">
              <Input
                placeholder="Filter by action..."
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-56"
              />
              <Button variant="outline" size="sm" onClick={() => { setPage(0); loadLogs(0, actionFilter); }}>Apply</Button>
              <Button variant="outline" size="sm" onClick={() => { setActionFilter(""); setPage(0); loadLogs(0, ""); }}>Clear</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{l.action}</Badge>
                    <span className="text-muted-foreground">{l.entity_type ?? "—"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {l.actor_name} · {new Date(l.created_at).toLocaleString()}
                    {l.ip_address ? ` · ${l.ip_address}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => { setPage(page - 1); loadLogs(page - 1); }}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={(page + 1) * 20 >= logTotal} onClick={() => { setPage(page + 1); loadLogs(page + 1); }}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Staff & accounts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{u.first_name} {u.last_name} <span className="text-muted-foreground">· {u.email}</span></p>
                  <div className="mt-1 flex items-center gap-2">
                    {u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}
                    <Badge variant={u.role === "business_owner" || u.role === "super_admin" ? "warning" : "secondary"}>{u.role}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded border bg-background px-2 py-1 text-sm"
                    value={u.role}
                    disabled={u.id === user?.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={u.id === user?.id || busy === u.id + ":status"}
                    onClick={() => toggleStatus(u)}
                  >
                    {u.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}