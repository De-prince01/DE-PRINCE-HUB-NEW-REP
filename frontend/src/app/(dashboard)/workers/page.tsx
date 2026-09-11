"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Star, Briefcase, CheckCircle2, UserRound, Wallet } from "lucide-react";

interface Worker {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  bio?: string | null;
  commission_rate: number;
  average_rating: number;
  total_jobs: number;
  is_available: boolean;
}

const workerRoles = [
  "printing_operator",
  "graphic_designer",
  "web_developer",
  "academic_service_worker",
  "technician",
  "delivery_person",
  "partner_freelancer",
];

const roleLabel: Record<string, string> = {
  printing_operator: "Printing Operator",
  graphic_designer: "Graphic Designer",
  web_developer: "Web Developer",
  academic_service_worker: "Academic Service",
  technician: "Technician",
  delivery_person: "Delivery Person",
  partner_freelancer: "Partner / Freelancer",
};

export default function WorkersPage() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState("");
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const [form, setForm] = useState({
    role: "partner_freelancer",
    specialties: "",
    bio: "",
    commission_rate: 20,
  });
  const [submitting, setSubmitting] = useState(false);
  const [earnings, setEarnings] = useState<{
    balance: number;
    commissions: { id: string; worker_amount: number; commission_amount: number; is_paid: boolean; created_at: string }[];
  } | null>(null);

  const [myProfile, setMyProfile] = useState<Worker | null>(null);
  const [editForm, setEditForm] = useState({ specialties: "", bio: "", commission_rate: 20, is_available: true });
  const [saving, setSaving] = useState(false);

  const load = async (sp: string = specialty) => {
    setLoading(true);
    try {
      const route = `/workers/marketplace${sp ? `?specialty=${encodeURIComponent(sp)}` : ""}`;
      const data = await api<Worker[]>(route);
      setWorkers(data || []);
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const profile = await api<Worker>("/workers/profile/me");
      setHasProfile(true);
      setMyProfile(profile);
      setEditForm({
        specialties: (profile.specialties || []).join(", "),
        bio: profile.bio || "",
        commission_rate: profile.commission_rate,
        is_available: profile.is_available,
      });
      api<typeof earnings>("/finance/commissions/mine").then(setEarnings).catch(() => setEarnings(null));
    } catch {
      setHasProfile(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api("/workers/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          specialties: editForm.specialties.split(",").map((s) => s.trim()).filter(Boolean),
          bio: editForm.bio,
          commission_rate: editForm.commission_rate,
          is_available: editForm.is_available,
        }),
      });
      showToast.success("Profile updated");
      await loadProfile();
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async () => {
    const next = !editForm.is_available;
    setEditForm((f) => ({ ...f, is_available: next }));
    try {
      await api("/workers/profile/me", {
        method: "PATCH",
        body: JSON.stringify({ is_available: next }),
      });
      showToast.success(next ? "You are now available for work" : "You are now unavailable");
      await loadProfile();
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  useEffect(() => {
    load();
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = async () => {
    setSubmitting(true);
    try {
      await api("/workers/apply", {
        method: "POST",
        body: JSON.stringify({
          role: form.role,
          specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
          bio: form.bio,
          commission_rate: form.commission_rate,
        }),
      });
      showToast.success("Worker profile created. You can now receive task assignments.");
      setHasProfile(true);
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Worker Marketplace</h1>
        <p className="text-muted-foreground">Find skilled partners or join the network as a worker</p>
      </div>

      {hasProfile === false && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Become a Worker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {workerRoles.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabel[r]}</SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Commission rate (%)</Label>
                <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Specialties (comma separated)</Label>
              <Input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="printing, binding, design" />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <Button onClick={apply} disabled={submitting}>
              <UserRound className="mr-2 h-4 w-4" /> {submitting ? "Applying..." : "Apply"}
            </Button>
          </CardContent>
        </Card>
      )}

      {hasProfile === true && (
        <div>
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            <CheckCircle2 className="h-5 w-5" /> You are registered as a worker on this platform.
          </div>

          {earnings && (
            <Card className="mt-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> My Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    <p className="text-2xl font-bold text-green-600">{formatNaira(earnings.balance)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Paid Out</p>
                    <p className="text-2xl font-bold">{formatNaira(earnings.commissions.filter((c) => c.is_paid).reduce((s, c) => s + c.worker_amount, 0))}</p>
                  </div>
                </div>

                {earnings.commissions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    You have no commissions yet. They appear here once a client orders a service you're assigned to.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {earnings.commissions.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border p-2">
                        <div>
                          <p className="text-sm font-medium">{formatNaira(c.worker_amount)} for this job</p>
                          <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                        </div>
                        <Badge className={c.is_paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                          {c.is_paid ? "Paid to wallet" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {myProfile && (
            <Card className="mt-3">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" /> My Profile
                  </span>
                  <Button size="sm" variant={editForm.is_available ? "default" : "outline"} onClick={toggleAvailability}>
                    {editForm.is_available ? "✓ Available" : "Mark Available"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Commission rate (%)</Label>
                    <Input type="number" value={editForm.commission_rate} onChange={(e) => setEditForm({ ...editForm, commission_rate: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Availability</Label>
                    <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                      <Badge className={editForm.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {editForm.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Specialties (comma separated)</Label>
                  <Input value={editForm.specialties} onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value })} placeholder="printing, binding, design" />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
                </div>
                <Button onClick={saveProfile} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Users className="h-5 w-5" /> Available Workers</span>
            <div className="flex items-center gap-2">
              <Input
                className="w-48"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Filter by specialty"
              />
              <Button size="sm" variant="outline" onClick={() => load()}>Apply</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : workers.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No available workers found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workers.map((w) => (
                <div key={w.id} className="flex flex-col rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{w.name}</span>
                    <Badge className="bg-green-100 text-green-700">Available</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{roleLabel[w.role] || w.role}</p>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{w.average_rating || "—"}</span>
                    <span className="text-muted-foreground">· {w.total_jobs} jobs</span>
                  </div>
                  {w.specialties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {w.specialties.map((s, i) => (
                        <Badge key={i} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {w.bio && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{w.bio}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
