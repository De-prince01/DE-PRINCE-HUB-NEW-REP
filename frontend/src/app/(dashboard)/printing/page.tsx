"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiForm } from "@/lib/api";
import { showToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils";
import { Printer, Upload, Wallet } from "lucide-react";

interface PrintJob {
  id: string;
  file_name: string;
  total_pages: number;
  copies: number;
  color_mode: string;
  paper_size: string;
  binding_type?: string | null;
  lamination: boolean;
  status: string;
  total_amount: number;
  is_paid: boolean;
  notes?: string | null;
  created_at: string;
}

const colorModes = ["bw", "color"];
const paperSizes = ["A4", "A3", "A5", "Letter", "Legal"];

export default function PrintingPage() {
  const { user } = useAuth();
  const isStaff = user && user.role !== "customer";

  // create form
  const [form, setForm] = useState({
    file_name: "",
    total_pages: 1,
    copies: 1,
    color_mode: "bw",
    paper_size: "A4",
    lamination: false,
    notes: "",
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // queue
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const route = isStaff ? "/printing/queue" : "/printing/jobs";
      const data = await api<PrintJob[]>(route);
      setJobs(data || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form.file_name) {
      showToast.error("Enter a file name");
      return;
    }
    setSubmitting(true);
    try {
      const job = await api<PrintJob>("/printing/jobs", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (files && files.length) {
        const fd = new FormData();
        Array.from(files).forEach((f) => fd.append("files", f));
        await apiForm(`/printing/jobs/${job.id}/file`, fd);
      }
      showToast.success("Print job created");
      setForm({ file_name: "", total_pages: 1, copies: 1, color_mode: "bw", paper_size: "A4", lamination: false, notes: "" });
      setFiles(null);
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api(`/printing/jobs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  const payJob = async (id: string) => {
    try {
      const res = await api<any>(`/printing/jobs/${id}/pay`, { method: "POST" });
      showToast.success(
        `Paid ${formatNaira(res.amount)} — balance ${formatNaira(res.balance)}`
      );
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Printing</h1>
        <p className="text-muted-foreground">Submit print jobs and track the queue</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Print Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Document name</Label>
            <Input
              value={form.file_name}
              onChange={(e) => setForm({ ...form, file_name: e.target.value })}
              placeholder="e.g. Assignment.docx"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pages</Label>
              <Input
                type="number"
                min={1}
                value={form.total_pages}
                onChange={(e) => setForm({ ...form, total_pages: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Copies</Label>
              <Input
                type="number"
                min={1}
                value={form.copies}
                onChange={(e) => setForm({ ...form, copies: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={form.color_mode} onChange={(e) => setForm({ ...form, color_mode: e.target.value })}>
                {colorModes.map((m) => (
                  <SelectItem key={m} value={m}>{m === "bw" ? "Black & white" : "Color"}</SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <Label>Paper size</Label>
              <Select value={form.paper_size} onChange={(e) => setForm({ ...form, paper_size: e.target.value })}>
                {paperSizes.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Upload file</Label>
            <div className="flex items-center gap-2">
              <Input type="file" multiple onChange={(e) => setFiles(e.target.files)} className="cursor-pointer" />
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Allowed: pdf, docx, jpg, png and more</p>
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Binding, color, special instructions…"
            />
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            <Printer className="mr-2 h-4 w-4" /> {submitting ? "Submitting..." : "Submit Print Job"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isStaff ? "Print Queue" : "Your Print Jobs"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No print jobs.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => (
                <div key={j.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-3 gap-2">
                  <div>
                    <p className="text-sm font-medium">{j.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.total_pages} × {j.copies} copy{j.copies > 1 ? "s" : ""} · {j.color_mode === "bw" ? "B&W" : "Color"} · {j.paper_size}
                      {j.total_amount > 0 ? ` · ${formatNaira(j.total_amount)}` : ""}
                      {j.notes ? ` — ${j.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      j.status === "completed" ? "bg-green-100 text-green-700"
                      : j.status === "printing" ? "bg-blue-100 text-blue-700"
                      : j.status === "cancelled" ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                    }>
                      {j.status}
                    </Badge>
                    {!isStaff && j.status === "completed" && (
                      j.is_paid ? (
                        <Badge className="bg-green-100 text-green-700">Paid</Badge>
                      ) : (
                        <Button size="sm" onClick={() => payJob(j.id)}>
                          <Wallet className="mr-1 h-3.5 w-3.5" /> Pay
                        </Button>
                      )
                    )}
                    {isStaff && j.status !== "completed" && j.status !== "cancelled" && (
                      <div className="flex gap-1">
                        {j.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(j.id, "printing")}>Start</Button>
                        )}
                        {j.status === "printing" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(j.id, "completed")}>Complete</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(j.id, "cancelled")}>Cancel</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
