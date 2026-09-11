"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminComputersPage() {
  const [computers, setComputers] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>("/admin/computers")
      .then(setComputers)
      .catch(() => setComputers([]));
  }, []);

  const toggle = async (id: string, status: string) => {
    try {
      await api(`/admin/computers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setComputers((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      showToast.success("Computer updated");
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cyber CafÃ©</h1>
        <p className="text-muted-foreground">Manage computer stations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {computers.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No computers found.</CardContent></Card>
        ) : (
          computers.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Computer {c.name}</p>
                  <Badge variant={c.status === "available" ? "success" : c.status === "in_use" ? "warning" : "secondary"}>
                    {c.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Rate: â‚¦{c.price_per_hour}/hr</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => toggle(c.id, "available")} variant="outline">Available</Button>
                  <Button size="sm" onClick={() => toggle(c.id, "in_use")} variant="outline">In Use</Button>
                  <Button size="sm" onClick={() => toggle(c.id, "maintenance")} variant="outline">Maintenance</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

