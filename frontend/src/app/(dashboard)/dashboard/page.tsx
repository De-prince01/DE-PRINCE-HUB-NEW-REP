"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Plus, RefreshCw, Monitor, Printer, Users, FileText, Repeat, Share2, LifeBuoy, Lock, ShieldCheck } from "lucide-react";
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
    { href: "/use", label: "Service Console", icon: ShoppingBag, desc: "Browse & order digital services" },
    { href: "/verifications", label: "Verification Centre", icon: ShieldCheck, desc: "NIN, BVN, CAC & document checks" },
    { href: "/computers", label: "Rent a Computer", icon: Monitor, desc: "Book cyber café time" },
    { href: "/printing", label: "Printing", icon: Printer, desc: "Submit a print job" },
    { href: "/quotations", label: "Quotations", icon: FileText, desc: "Request and review quotes" },
    { href: "/subscriptions", label: "Subscriptions", icon: Repeat, desc: "Manage recurring plans" },
    { href: "/referrals", label: "Referrals", icon: Share2, desc: "Earn from referrals" },
    { href: "/support", label: "Support Centre", icon: LifeBuoy, desc: "Tickets, FAQs & refunds" },
    { href: "/privacy", label: "Privacy", icon: Lock, desc: "Consent, export & deletion" },
    { href: "/workers", label: "Worker Marketplace", icon: Users, desc: "Find skilled partners" },
  ];

  const firstName = user?.first_name;
  const displayName = firstName ? firstName : "there";

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#D4A84B]/25 bg-[#111111]">
        <div className="flex flex-col-reverse lg:flex-row lg:items-center">
          <div className="flex-1 p-6 sm:p-8 lg:p-10">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Hello, {displayName}!{" "}
              <span className="inline-block">👋</span>
            </h1>
            <p className="mt-3 text-xl font-semibold text-[#E8C879] sm:text-2xl">
              Welcome to DEPRINCE DIGITAL HUB
            </p>
            <p className="mt-1 text-base font-medium text-white">
              Everything Digital. One Platform.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#A8A8A8]">
              Access digital services, verification, JAMB services, printing,
              graphics, web design, programming and more from one platform.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/use">
                <Button>
                  <Plus className="h-4 w-4" /> New Order
                </Button>
              </Link>
              <Link href="/verifications">
                <Button variant="outline" className="border-[#D4A84B]/40 text-[#E8C879] hover:bg-[#D4A84B]/10">
                  <ShieldCheck className="h-4 w-4" /> Verify Now
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative h-56 w-full sm:h-72 lg:h-auto lg:w-[46%] lg:self-stretch">
            <Image
              src="/images/deprince-welcome.jpg"
              alt="DEPRINCE DIGITAL HUB customer using digital services on a laptop"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#111111]/20 to-transparent hidden lg:block" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href} className="block">
            <Card className="transition hover:shadow-[0_0_20px_rgba(212,168,75,0.2)] hover:border-[#D4A84B]/60">
              <CardContent className="p-4">
                <q.icon className="h-6 w-6 text-[#E8C879]" />
                <p className="mt-2 font-semibold text-white">{q.label}</p>
                <p className="text-sm text-[#A8A8A8]">{q.desc}</p>
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
                <p className="text-sm text-[#A8A8A8]">Total Orders</p>
                <p className="text-2xl font-bold text-white">{orders.length}</p>
              </div>
              <Package className="h-8 w-8 text-[#A8A8A8]/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A8A8A8]">Active Orders</p>
                <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-[#E8C879]/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-white">Recent Orders</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4A84B] border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto h-10 w-10 text-[#A8A8A8]/30" />
              <p className="mt-3 text-[#A8A8A8]">No orders yet.</p>
              <Link href="/use" className="mt-3 inline-block">
                <Button variant="outline">Place your first order</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.order_number}`}
                  className="flex items-center justify-between rounded-lg border border-[#D4A84B]/20 p-3 transition hover:bg-[#222]"
                >
                  <div>
                    <p className="font-medium text-white">{order.order_number}</p>
                    <p className="text-sm text-[#A8A8A8]">
                      {order.items.map((i) => i.service_name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatNaira(order.total)}</p>
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
