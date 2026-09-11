"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Play, Square, Wallet } from "lucide-react";

interface Computer {
  id: string;
  name: string;
  status: string;
  hourly_rate: number;
  specs?: string | null;
}

interface Session {
  id: string;
  computer_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_minutes: number;
  hourly_rate: number;
  total_amount: number;
  is_paid: boolean;
}

const statusColor: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  in_use: "bg-red-100 text-red-700",
  reserved: "bg-amber-100 text-amber-700",
  maintenance: "bg-gray-100 text-gray-700",
  offline: "bg-gray-100 text-gray-700",
};

export default function ComputersPage() {
  const [available, setAvailable] = useState<Computer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [av, my] = await Promise.all([
        api<Computer[]>("/computers/available"),
        api<Session[]>("/computers/sessions/mine"),
      ]);
      setAvailable(av || []);
      setSessions(my || []);
    } catch {
      setAvailable([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const book = async (id: string) => {
    setBusyId(id);
    try {
      await api(`/computers/${id}/book`, { method: "POST", body: "{}" });
      showToast.success("Computer booked. Your session has started.");
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const stop = async (sessionId: string) => {
    setBusyId(sessionId);
    try {
      await api(`/computers/session/${sessionId}/stop`, { method: "POST", body: "{}" });
      showToast.success("Session ended. Pay the bill below.");
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const pay = async (sessionId: string) => {
    setBusyId(sessionId);
    try {
      await api(`/computers/session/${sessionId}/pay`, { method: "POST", body: "{}" });
      showToast.success("Session paid from wallet.");
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const active = sessions.find((s) => !s.ended_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Computer Rental</h1>
        <p className="text-muted-foreground">Book a computer and pay only for what you use</p>
      </div>

      {active && (
        <Card className="border-primary">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Active session started</p>
              <p className="font-semibold">{formatDate(active.started_at)}</p>
            </div>
            <Button variant="destructive" onClick={() => stop(active.id)} disabled={busyId === active.id}>
              <Square className="mr-2 h-4 w-4" /> End Session
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Computers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : available.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No computers available right now.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((c) => (
                <div key={c.id} className="flex flex-col justify-between rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    <Badge className={statusColor[c.status] || "bg-gray-100 text-gray-700"}>{c.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{formatNaira(c.hourly_rate)} / hour</p>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => book(c.id)}
                    disabled={busyId === c.id || !!active}
                  >
                    <Play className="mr-2 h-4 w-4" /> Book Now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No sessions yet.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-3 gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(s.started_at)}
                      {s.ended_at && <span className="text-muted-foreground"> → {formatDate(s.ended_at)}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.duration_minutes} min @ {formatNaira(s.hourly_rate)}/hr
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatNaira(s.total_amount)}</span>
                    {!s.is_paid && s.ended_at ? (
                      <Button size="sm" onClick={() => pay(s.id)} disabled={busyId === s.id}>
                        <Wallet className="mr-1 h-4 w-4" /> Pay
                      </Button>
                    ) : s.is_paid ? (
                      <Badge className="bg-green-100 text-green-700">Paid</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">In progress</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!available.length && !sessions.length && (
        <p className="text-sm text-muted-foreground">
          Manage computers in the <Link className="text-primary underline" href="/admin/computers">Cyber Café admin</Link>.
        </p>
      )}
    </div>
  );
}
