"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Plus, RefreshCw, Monitor, Printer, Users, FileText, Repeat, Share2, LifeBuoy, Lock } from "lucide-react";
import type { Order } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api<Order[]>("/orders");
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((o) => !["delivered", "cancelled", "refunded", "completed"].includes(o.status));

  const quickLinks = [
    { href: "/services", label: "Order Services", icon: ShoppingBag, desc: "Browse digital services" },
    { href: "/computers", label: "Rent a Computer", icon: Monitor, desc: "Book cyber café time" },
    { href: "/printing", label: "Printing", icon: Printer, desc: "Submit a print job" },
    { href: "/quotations", label: "Quotations", icon: FileText, desc: "Request and review quotes" },
    { href: "/subscriptions", label: "Subscriptions", icon: Repeat, desc: "Manage recurring plans" },
    { href: "/referrals", label: "Referrals", icon: Share2, desc: "Earn from referrals" },
    { href: "/support", label: "Support Centre", icon: LifeBuoy, desc: "Tickets, FAQs & refunds" },
    { href: "/privacy", label: "Privacy", icon: Lock, desc: "Consent, export & deletion" },
    { href: "/workers", label: "Worker Marketplace", icon: Users, desc: "Find skilled partners" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {user?.first_name}!
          </h1>
          <p className="text-muted-foreground">Everything digital, one platform.</p>
        </div>
        <Link href="/services">
          <Button>
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href} className="block">
            <Card className="transition hover:shadow-md">
              <CardContent className="p-4">
                <q.icon className="h-6 w-6 text-primary" />
                <p className="mt-2 font-semibold">{q.label}</p>
                <p className="text-sm text-muted-foreground">{q.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Orders</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-muted-foreground">No orders yet.</p>
              <Link href="/services" className="mt-3 inline-block">
                <Button variant="outline">Place your first order</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.order_number}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.items.map((i) => i.service_name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatNaira(order.total)}</p>
                    <Badge variant="secondary" className="capitalize">
                      {order.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
