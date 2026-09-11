"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2 } from "lucide-react";
import type { Delivery, DeliveryZone } from "@/types";

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const statusVariant: Record<string, string> = {
  pending: "outline",
  assigned: "info",
  picked_up: "warning",
  out_for_delivery: "warning",
  delivered: "success",
  cancelled: "destructive",
};

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [persons, setPersons] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<Record<string, string>>({});

  const [zoneName, setZoneName] = useState("");
  const [zoneFee, setZoneFee] = useState("");
  const [zoneTime, setZoneTime] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [d, z, p] = await Promise.all([
        api<Delivery[]>("/delivery"),
        api<DeliveryZone[]>("/delivery/zones"),
        api<StaffUser[]>("/admin/users?role=delivery_person"),
      ]);
      setDeliveries(d || []);
      setZones(z || []);
      setPersons(p || []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assign = async (id: string) => {
    const personId = assignId[id];
    if (!personId) {
      showToast.error("Select a delivery person first");
      return;
    }
    setBusy(id);
    try {
      await api(`/delivery/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ delivery_person_id: personId }),
      });
      showToast.success("Assigned");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to assign");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      await api(`/delivery/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast.success(`Delivery → ${status.replace(/_/g, " ")}`);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to update status");
    } finally {
      setBusy(null);
    }
  };

  const createZone = async () => {
    if (!zoneName.trim()) return;
    try {
      await api("/delivery/zones", {
        method: "POST",
        body: JSON.stringify({ name: zoneName.trim(), fee: parseFloat(zoneFee) || 0, estimated_time: zoneTime.trim() || null }),
      });
      showToast.success("Zone created");
      setZoneName("");
      setZoneFee("");
      setZoneTime("");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to create zone");
    }
  };

  const counts = {
    pending: deliveries.filter((d) => d.status === "pending").length,
    out: deliveries.filter((d) => ["assigned", "picked_up", "out_for_delivery"].includes(d.status)).length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="text-muted-foreground">Dispatch, assign and track deliveries</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground capitalize">Awaiting assignment</p>
            <p className="text-2xl font-bold">{counts.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground capitalize">In transit</p>
            <p className="text-2xl font-bold">{counts.out}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground capitalize">Delivered</p>
            <p className="text-2xl font-bold">{counts.delivered}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {zones.map((z) => (
              <Badge key={z.id} variant="outline">
                {z.name} · {formatNaira(z.fee)}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs">Zone name</Label>
              <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="e.g. GRA Phase 1" />
            </div>
            <div className="w-28">
              <Label className="text-xs">Fee (₦)</Label>
              <Input value={zoneFee} onChange={(e) => setZoneFee(e.target.value)} inputMode="decimal" placeholder="1500" />
            </div>
            <div className="w-36">
              <Label className="text-xs">Est. time</Label>
              <Input value={zoneTime} onChange={(e) => setZoneTime(e.target.value)} placeholder="30–45 min" />
            </div>
            <Button onClick={createZone} disabled={!zoneName.trim()}>
              Add zone
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="h-32 animate-pulse" />
        </Card>
      ) : deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No deliveries. Customers request delivery from their order page.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d) => {
            const active = ["pending", "assigned", "picked_up", "out_for_delivery"].includes(d.status);
            return (
              <Card key={d.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border p-2">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{d.order_number || d.order_id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.zone_name || "Custom"} · {formatNaira(d.fee)}
                        {d.address ? ` · ${d.address}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.delivery_person_name || "Unassigned"} · {formatDate(d.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={(statusVariant[d.status] || "outline") as any}>{d.status.replace(/_/g, " ")}</Badge>
                    {active && d.status === "pending" && (
                      <>
                        <select
                          className="rounded-md border px-2 py-1 text-sm"
                          value={assignId[d.id] || ""}
                          onChange={(e) => setAssignId((prev) => ({ ...prev, [d.id]: e.target.value }))}
                        >
                          <option value="">Assign to…</option>
                          {persons.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.first_name} {p.last_name}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" variant="outline" onClick={() => assign(d.id)} disabled={busy === d.id}>
                          Assign
                        </Button>
                      </>
                    )}
                    {active && d.status !== "picked_up" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(d.id, "picked_up")} disabled={busy === d.id}>
                        Picked up
                      </Button>
                    )}
                    {active && d.status !== "out_for_delivery" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(d.id, "out_for_delivery")} disabled={busy === d.id}>
                        Out for delivery
                      </Button>
                    )}
                    {active && d.status !== "delivered" && (
                      <Button size="sm" onClick={() => setStatus(d.id, "delivered")} disabled={busy === d.id}>
                        Mark delivered
                      </Button>
                    )}
                    {active && d.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(d.id, "cancelled")} disabled={busy === d.id}>
                        Cancel
                      </Button>
                    )}
                    {busy === d.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}