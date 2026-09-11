"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { Order } from "@/types";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline"> = {
  pending: "warning",
  payment_pending: "warning",
  paid: "info",
  received: "info",
  assigned: "info",
  in_progress: "info",
  quality_check: "secondary",
  completed: "success",
  ready_for_pickup: "secondary",
  delivered: "success",
  cancelled: "destructive",
  refunded: "destructive",
};

export default function OrdersPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">Track and manage your orders</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-muted-foreground">You have no orders.</p>
            <Link href="/services" className="mt-4 inline-block text-primary hover:underline">
              Browse services
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.order_number}`}>
              <Card className="transition hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.items.map((i) => i.service_name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatNaira(order.total)}</p>
                    <Badge className="mt-1 capitalize" variant={statusVariant[order.status] || "secondary"}>
                      {order.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
