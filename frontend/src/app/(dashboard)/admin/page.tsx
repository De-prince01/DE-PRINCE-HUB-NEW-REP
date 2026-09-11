"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, Users, Monitor, TrendingUp, TrendingDown, Printer,
  ShoppingCart, Boxes, Wallet, Coins, ArrowRight, ShieldCheck, Layers, CalendarClock, Truck, FileText, Repeat, Share2, LifeBuoy, BarChart3, Lock, Landmark,
} from "lucide-react";

interface Stats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_revenue: number;
  active_workers: number;
  active_sessions: number;
  print_queue: number;
  total_expenses: number;
  profit: number;
  recent_orders?: { id: string; order_number: string; status: string; total: number }[];
}

interface Item { id: string; name: string; quantity: number; low_stock_threshold: number; }
interface Commission { id: string; worker_amount: number; is_paid: boolean; }

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  payment_pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  received: "bg-blue-100 text-blue-700",
  assigned: "bg-violet-100 text-violet-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-green-100 text-green-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lowStock, setLowStock] = useState<Item[]>([]);
  const [pendingCommissions, setPendingCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => setStats(null));
    api<Item[]>("/inventory/low-stock").then(setLowStock).catch(() => setLowStock([]));
    api<Commission[]>("/finance/commissions?unpaid_only=true")
      .then(setPendingCommissions)
      .catch(() => setPendingCommissions([]));
  }, []);

  const pendingCommissionAmount = pendingCommissions.reduce((s, c) => s + c.worker_amount, 0);

  const quickLinks = [
    { href: "/admin/pos", label: "POS Register", icon: ShoppingCart, desc: "Counter checkout" },
    { href: "/admin/services", label: "Services", icon: Layers, desc: "Manage catalogue & pricing" },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes, desc: `${lowStock.length} low-stock items` },
    { href: "/admin/computers", label: "Cyber Café", icon: Monitor, desc: `${stats?.active_sessions ?? 0} active sessions` },
    { href: "/printing", label: "Print Queue", icon: Printer, desc: `${stats?.print_queue ?? 0} jobs queued` },
    { href: "/admin/finance", label: "Finance", icon: Coins, desc: formatNaira(pendingCommissionAmount) + " commissions due" },
    { href: "/admin/withdrawals", label: "Bank Payouts", icon: Landmark, desc: "Approve wallet withdrawals" },
    { href: "/admin/identity", label: "Identity", icon: ShieldCheck, desc: "Verify NIN / BVN / SNIN" },
    { href: "/admin/appointments", label: "Appointments", icon: CalendarClock, desc: "Bookings & check-ins" },
    { href: "/admin/deliveries", label: "Deliveries", icon: Truck, desc: "Dispatch & tracking" },
    { href: "/admin/quotations", label: "Quotations", icon: FileText, desc: "Quote requests & offers" },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: Repeat, desc: "Recurring plans & renewals" },
    { href: "/admin/referrals", label: "Referrals", icon: Share2, desc: "Program & rewards" },
    { href: "/admin/support", label: "Support Centre", icon: LifeBuoy, desc: "Tickets & disputes" },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, desc: "Revenue & performance" },
    { href: "/admin/business", label: "Business Model", icon: Landmark, desc: "Revenue streams & tagging" },
    { href: "/admin/privacy", label: "Data Governance", icon: Lock, desc: "Privacy requests & audit" },
    { href: "/workers", label: "Workers", icon: Users, desc: `${stats?.active_workers ?? 0} partners` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">Business at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatNaira(stats?.total_revenue ?? 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit</p>
                <p className="text-2xl font-bold">{formatNaira(stats?.profit ?? 0)}</p>
              </div>
              <Wallet className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-2xl font-bold">{formatNaira(stats?.total_expenses ?? 0)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats?.total_orders ?? 0}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats?.pending_orders ?? 0} pending · {stats?.completed_orders ?? 0} completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Operations</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href} className="block">
              <Card className="transition hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <q.icon className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{q.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{q.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {stats?.recent_orders && stats.recent_orders.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent Orders</h2>
          <Card>
            <CardContent className="divide-y">
              {stats.recent_orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{o.order_number}</span>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColor[o.status] || "bg-gray-100 text-gray-700"}>{o.status}</Badge>
                    <span className="font-semibold">{formatNaira(o.total)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
