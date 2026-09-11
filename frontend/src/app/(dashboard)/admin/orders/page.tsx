"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem } from "@/components/ui/select";
import { UserRound, UserCheck, PlusCircle } from "lucide-react";
import type { Order } from "@/types";

const statuses = [
  "pending", "payment_pending", "paid", "received", "assigned",
  "in_progress", "quality_check", "completed", "ready_for_pickup",
  "delivered", "cancelled", "refunded",
];

interface Worker {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  commission_rate: number;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assignSel, setAssignSel] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<Order[]>("/admin/orders").then(setOrders).catch(() => setOrders([]));
    api<Worker[]>("/workers/marketplace").then(setWorkers).catch(() => setWorkers([]));
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      showToast.success("Status updated");
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  const assign = async (orderId: string) => {
    const workerId = assignSel[orderId];
    if (!workerId) {
      showToast.error("Select a worker first");
      return;
    }
    setBusy(orderId);
    try {
      await api(`/workers/orders/${orderId}/assign`, {
        method: "POST",
        body: JSON.stringify({ worker_id: workerId }),
      });
      showToast.success("Worker assigned to order");
      await api<Order[]>("/admin/orders").then(setOrders).catch(() => {});
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const createCommission = async (orderId: string) => {
    const workerId = assignSel[orderId];
    if (!workerId) {
      showToast.error("Assign a worker to this order first");
      return;
    }
    setBusy(orderId);
    try {
      const res = await api<any>(`/finance/orders/${orderId}/commission`, {
        method: "POST",
        body: JSON.stringify({ worker_id: workerId, commission_rate: 20 }),
      });
      showToast.success(`Commission ₦${res.commission_amount} generated (worker gets ₦${res.worker_amount})`);
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Orders</h1>
        <p className="text-muted-foreground">
          Manage statuses, assign workers, and generate commissions
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">No orders yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.items.map((i) => i.service_name).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatNaira(order.total)}</span>
                    <Select
                      placeholder="Status"
                      value={order.status}
                      onValueChange={(v) => updateStatus(order.id, v)}
                      className="w-44"
                    >
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <Select
                    placeholder="Assign worker…"
                    value={assignSel[order.id] || ""}
                    onValueChange={(v) => setAssignSel((s) => ({ ...s, [order.id]: v }))}
                    className="w-56"
                  >
                    {(workers || []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name} — {w.role.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => assign(order.id)}
                    disabled={busy === order.id}
                  >
                    <UserCheck className="mr-1 h-4 w-4" /> Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createCommission(order.id)}
                    disabled={busy === order.id}
                  >
                    <PlusCircle className="mr-1 h-4 w-4" /> Commission
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
