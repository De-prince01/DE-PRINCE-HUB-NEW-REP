"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Circle, Truck } from "lucide-react";
import { ReceiptDialog } from "@/components/ui/receipt-dialog";
import type { Order, OrderMessage, Delivery, DeliveryZone } from "@/types";

const deliverySteps = ["pending", "assigned", "picked_up", "out_for_delivery", "delivered"];

export default function OrderDetailPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadOrder();
    loadMessages();
  }, [orderNumber]);

  const loadOrder = async () => {
    try {
      const all = await api<Order[]>("/orders");
      const found = all.find((o) => o.order_number === orderNumber);
      setOrder(found || null);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      if (!order?.id) return;
      const msgs = await api<OrderMessage[]>(`/orders/${order.id}/messages`);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => { loadMessages(); }, [order?.id]);

  useEffect(() => { loadDelivery(); }, [order?.id]);

  const loadZones = async () => {
    try {
      setZones((await api<DeliveryZone[]>("/delivery/zones")) || []);
    } catch {
      setZones([]);
    }
  };

  const loadDelivery = async () => {
    if (!order?.id) return;
    try {
      const all = await api<Delivery[]>("/delivery");
      const found = all.find((d) => d.order_id === order.id);
      setDelivery(found || null);
      if (!found) await loadZones();
    } catch {
      setDelivery(null);
    }
  };

  const requestDelivery = async () => {
    if (!order || requesting) return;
    if (!zoneId && !address.trim()) {
      showToast.error("Select a delivery zone or enter an address");
      return;
    }
    setRequesting(true);
    try {
      await api("/delivery", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id, zone_id: zoneId || null, address: address.trim() || null }),
      });
      showToast.success("Delivery requested");
      setAddress("");
      await loadDelivery();
      await loadZones();
    } catch (err: any) {
      showToast.error(err.message || "Failed to request delivery");
    } finally {
      setRequesting(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !order) return;
    setSending(true);
    try {
      await api(`/orders/${order.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setMessage("");
      await loadMessages();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const timeline = [
    { label: "Order received", status: ["pending", "payment_pending", "paid", "received", "assigned", "in_progress", "quality_check", "completed", "ready_for_pickup", "delivered"].includes(order?.status || "") },
    { label: "Payment confirmed", status: ["paid", "received", "assigned", "in_progress", "quality_check", "completed", "ready_for_pickup", "delivered"].includes(order?.status || "") },
    { label: "Assigned to worker", status: ["assigned", "in_progress", "quality_check", "completed", "ready_for_pickup", "delivered"].includes(order?.status || "") },
    { label: "Work in progress", status: ["in_progress", "quality_check", "completed", "ready_for_pickup", "delivered"].includes(order?.status || "") },
    { label: "Quality check", status: ["quality_check", "completed", "ready_for_pickup", "delivered"].includes(order?.status || "") },
    { label: "Completed", status: ["completed", "ready_for_pickup", "delivered"].includes(order?.status || "") },
    { label: "Delivered", status: ["delivered"].includes(order?.status || "") },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return <div className="py-16 text-center text-muted-foreground">Order not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{order.order_number}</h1>
        <Badge className="mt-1 capitalize">{order.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeline.map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    {step.status ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                    <span className={step.status ? "font-medium" : "text-muted-foreground"}>{step.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chat about this order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="rounded-lg bg-muted p-3">
                      <p className="text-sm">{m.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a message..."
                    rows={2}
                  />
                  <Button onClick={sendMessage} disabled={sending || !message.trim()}>
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            {delivery ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium capitalize">{delivery.status.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground">
                      {delivery.zone_name || "Custom delivery"}
                      {delivery.delivery_person_name ? ` · ${delivery.delivery_person_name}` : ""}
                    </p>
                    {delivery.address && <p className="text-muted-foreground">{delivery.address}</p>}
                    <p className="text-muted-foreground">Fee: {formatNaira(delivery.fee)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {deliverySteps.map((s) => {
                    const done = deliverySteps.indexOf(delivery.status) >= deliverySteps.indexOf(s) && delivery.status !== "cancelled";
                    return (
                      <div key={s} className="flex items-center gap-2 text-sm">
                        {done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                        <span className={done ? "font-medium" : "text-muted-foreground"}>{s.replace(/_/g, " ")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">This order is set for pickup. Request a delivery.</p>
                {zones.length > 0 && (
                  <>
                    <div>
                      <Label className="text-xs">Zone</Label>
                      <div className="space-y-2 pt-1">
                        {zones.map((z) => (
                          <label key={z.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                            <input
                              type="radio"
                              name="zone"
                              value={z.id}
                              checked={zoneId === z.id}
                              onChange={() => setZoneId(z.id)}
                            />
                            <span>
                              {z.name} · {formatNaira(z.fee)}
                              {z.estimated_time ? ` (~${z.estimated_time})` : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Or custom address</Label>
                      <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" className="mt-1" />
                    </div>
                    <Button size="sm" className="w-full" onClick={requestDelivery} disabled={requesting}>
                      {requesting ? "Requesting..." : "Request delivery"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.service_name} × {item.quantity}</span>
                  <span>{formatNaira(item.total_price)}</span>
                </div>
              ))}
              {delivery && (
                <div className="flex justify-between text-sm">
                  <span>Delivery</span>
                  <span>{formatNaira(delivery.fee)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatNaira(order.total)}</span>
              </div>
            </div>
            {["paid", "received", "assigned", "in_progress", "quality_check", "completed", "ready_for_pickup", "delivered"].includes(order.status) && (
              <div className="pt-3">
                <ReceiptDialog orderId={order.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
