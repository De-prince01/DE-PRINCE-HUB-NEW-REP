"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, UserCheck, Loader2 } from "lucide-react";
import type { Appointment } from "@/types";

const statusBadge: Record<string, { label: string; variant: string }> = {
  requested: { label: "Requested", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "info" },
  reminder_sent: { label: "Reminder sent", variant: "info" },
  checked_in: { label: "Checked in", variant: "warning" },
  in_service: { label: "In service", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  missed: { label: "Missed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  rescheduled: { label: "Rescheduled", variant: "secondary" },
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setAppointments((await api<Appointment[]>("/appointments")) || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      await api(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast.success(`Status → ${status.replace(/_/g, " ")}`);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to update status");
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    appointments.forEach((a) => {
      c[a.status] = (c[a.status] || 0) + 1;
    });
    return c;
  }, [appointments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-muted-foreground">Manage customer appointments</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {["requested", "confirmed", "checked_in", "in_service", "completed"].map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground capitalize">{s.replace(/_/g, " ")}</p>
              <p className="text-2xl font-bold">{counts[s] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="h-32 animate-pulse" />
        </Card>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No appointments.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const sb = statusBadge[a.status] || { label: a.status, variant: "outline" };
            const isActive = ["requested", "confirmed", "reminder_sent", "checked_in", "in_service"].includes(a.status);
            return (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border p-2">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {a.customer_name || a.customer_id.slice(0, 8)} · {a.service_name || "General"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(a.date)} · {a.time} · {a.duration_minutes} min
                        {a.branch_name ? ` · ${a.branch_name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.appointment_number}</p>
                      {a.notes && <p className="mt-1 text-sm text-muted-foreground">{a.notes}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={sb.variant as any}>{sb.label}</Badge>
                    {isActive && (
                      <>
                        {a.status !== "confirmed" && (
                          <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => setStatus(a.id, "confirmed")}>
                            <Check className="mr-1 h-3 w-3" /> Confirm
                          </Button>
                        )}
                        {a.status !== "checked_in" && a.status !== "in_service" && (
                          <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => setStatus(a.id, "checked_in")}>
                            <UserCheck className="mr-1 h-3 w-3" /> Check in
                          </Button>
                        )}
                        {a.status !== "in_service" && a.status !== "completed" && (
                          <Button size="sm" variant="ghost" disabled={busy === a.id} onClick={() => setStatus(a.id, "in_service")}>
                            Start service
                          </Button>
                        )}
                        {a.status !== "completed" && (
                          <Button size="sm" variant="secondary" disabled={busy === a.id} onClick={() => setStatus(a.id, "completed")}>
                            Complete
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={busy === a.id} onClick={() => setStatus(a.id, "missed")}>
                          <X className="mr-1 h-3 w-3" /> Missed
                        </Button>
                      </>
                    )}
                    {busy === a.id && <Loader2 className="h-4 w-4 animate-spin" />}
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