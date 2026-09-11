"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Plus, Loader2 } from "lucide-react";
import type { Appointment, Service } from "@/types";

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

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [appts, svcs] = await Promise.all([
        api<Appointment[]>("/appointments"),
        api<Service[]>("/services"),
      ]);
      setAppointments(appts || []);
      setServices(svcs || []);
    } catch {
      setAppointments([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const book = async () => {
    if (!date || !time) {
      showToast.error("Date and time are required");
      return;
    }
    setSubmitting(true);
    try {
      await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          service_id: serviceId || undefined,
          date,
          time,
          duration_minutes: duration,
          notes: notes || undefined,
        }),
      });
      showToast.success("Appointment requested");
      setOpen(false);
      setServiceId("");
      setDate("");
      setTime("");
      setDuration(30);
      setNotes("");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: string) => {
    setCancelling(id);
    try {
      await api(`/appointments/${id}/cancel`, { method: "PATCH", body: "{}" });
      showToast.success("Appointment cancelled");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to cancel");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Book or track appointments for services that need one</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Book appointment
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="h-32 animate-pulse" />
        </Card>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No appointments yet. Book one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const sb = statusBadge[a.status] || { label: a.status, variant: "outline" };
            return (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border p-2">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {a.service_name || "General appointment"} ·{" "}
                        {formatDate(a.date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {a.time} · {a.duration_minutes} min
                        {a.branch_name ? ` · ${a.branch_name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.appointment_number}</p>
                      {a.notes && <p className="mt-1 text-sm text-muted-foreground">{a.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sb.variant as any}>{sb.label}</Badge>
                    {a.status === "requested" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancelling === a.id}
                        onClick={() => cancel(a.id)}
                      >
                        {cancelling === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book an appointment</DialogTitle>
            <DialogDescription>
              Choose a service and when you'd like to visit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service (optional)</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v) || 30)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. I'll bring the required documents"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={book} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}