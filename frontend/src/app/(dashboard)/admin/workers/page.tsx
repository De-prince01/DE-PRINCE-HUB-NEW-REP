"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
  specialties: string[];
  commission_rate: number;
  total_earnings: number;
  total_jobs: number;
  average_rating: number;
  is_available: boolean;
  is_active: boolean;
}

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    api<Worker[]>("/admin/workers")
      .then(setWorkers)
      .catch(() => setWorkers([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workers</h1>
        <p className="text-muted-foreground">Manage worker/partner accounts</p>
      </div>

      {workers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No workers found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {workers.map((w) => (
            <Card key={w.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="text-sm text-muted-foreground">{w.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.specialties.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={w.is_active ? "success" : "secondary"}>
                    {w.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {w.total_jobs} jobs · {w.commission_rate}% commission
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
