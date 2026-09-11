"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  ScanFace,
  Calendar,
  Truck,
  PackageOpen,
  CheckCircle2,
  X,
} from "lucide-react";
import type { Service, ServiceCategory } from "@/types";

const VERIFICATION_STATUSES = ["not_verified", "verified", "needs_review", "suspended"];
const PRICE_TYPES = ["fixed", "quote", "range"];

const REQUIREMENT_FIELDS: { key: string; label: string }[] = [
  { key: "requires_file_upload", label: "File upload" },
  { key: "requires_description", label: "Description" },
  { key: "requires_physical_presence", label: "Physical presence" },
  { key: "requires_biometric", label: "Biometric capture" },
  { key: "requires_photograph", label: "Photograph" },
  { key: "requires_signature", label: "Signature" },
  { key: "requires_appointment", label: "Appointment" },
  { key: "requires_staff", label: "Staff processing" },
  { key: "requires_worker", label: "Worker execution" },
];

const LOGISTIC_FIELDS: { key: string; label: string }[] = [
  { key: "delivery_available", label: "Delivery available" },
  { key: "pickup_available", label: "Pickup available" },
  { key: "payment_required", label: "Payment required" },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}

function ListInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="icon" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {item}
              <button onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface FormState {
  category_id: string;
  name: string;
  icon: string;
  short_description: string;
  description: string;
  price_type: string;
  base_price: number;
  price_unit: string;
  quotation_required: boolean;
  minimum_price: number | null;
  maximum_price: number | null;
  estimated_processing_time: string;
  commission_type: string;
  commission_value: number;
  official_provider: string;
  official_provider_url: string;
  official_fee: number | null;
  deprince_fee: number | null;
  verification_status: string;
  service_instructions: string;
  requirements: string[];
  required_documents: string[];
  requires_file_upload: boolean;
  requires_description: boolean;
  requires_physical_presence: boolean;
  requires_biometric: boolean;
  requires_photograph: boolean;
  requires_signature: boolean;
  requires_appointment: boolean;
  requires_staff: boolean;
  requires_worker: boolean;
  delivery_available: boolean;
  pickup_available: boolean;
  payment_required: boolean;
  is_seasonal: boolean;
  season_months: number[];
  season_label: string;
  is_active: boolean;
}

function emptyForm(categoryId: string): FormState {
  return {
    category_id: categoryId,
    name: "",
    icon: "",
    short_description: "",
    description: "",
    price_type: "fixed",
    base_price: 0,
    price_unit: "fixed",
    quotation_required: false,
    minimum_price: null,
    maximum_price: null,
    estimated_processing_time: "",
    commission_type: "percentage",
    commission_value: 20,
    official_provider: "",
    official_provider_url: "",
    official_fee: null,
    deprince_fee: null,
    verification_status: "not_verified",
    service_instructions: "",
    requirements: [],
    required_documents: [],
    requires_file_upload: false,
    requires_description: true,
    requires_physical_presence: false,
    requires_biometric: false,
    requires_photograph: false,
    requires_signature: false,
    requires_appointment: false,
    requires_staff: false,
    requires_worker: false,
    delivery_available: false,
    pickup_available: false,
    payment_required: true,
    is_seasonal: false,
    season_months: [],
    season_label: "",
    is_active: true,
  };
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [saving, setSaving] = useState(false);

  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [svcs, cats] = await Promise.all([
        api<Service[]>("/services?include_inactive=true"),
        api<ServiceCategory[]>("/services/categories"),
      ]);
      setServices(svcs || []);
      setCategories(cats || []);
    } catch {
      setServices([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return services;
    return services.filter((s) => s.category_id === filter);
  }, [services, filter]);

  const openCreate = () => {
    setEditing(null);
    const defaultCat = filter !== "all" ? filter : categories[0]?.id || "";
    setForm(emptyForm(defaultCat));
    setOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditing(svc);
    setForm({
      category_id: svc.category_id,
      name: svc.name,
      icon: svc.icon || "",
      short_description: svc.short_description || "",
      description: svc.description || "",
      price_type: svc.price_type || "fixed",
      base_price: svc.base_price,
      price_unit: svc.price_unit || "fixed",
      quotation_required: svc.quotation_required,
      minimum_price: svc.minimum_price ?? null,
      maximum_price: svc.maximum_price ?? null,
      estimated_processing_time: svc.estimated_processing_time || svc.estimated_duration || "",
      commission_type: svc.commission_type || "percentage",
      commission_value: svc.commission_value,
      official_provider: svc.official_provider || "",
      official_provider_url: svc.official_provider_url || "",
      official_fee: svc.official_fee ?? null,
      deprince_fee: svc.deprince_fee ?? null,
      verification_status: svc.verification_status || "not_verified",
      service_instructions: svc.service_instructions || "",
      requirements: svc.requirements || [],
      required_documents: svc.required_documents || [],
      requires_file_upload: svc.requires_file_upload,
      requires_description: svc.requires_description,
      requires_physical_presence: svc.requires_physical_presence,
      requires_biometric: svc.requires_biometric,
      requires_photograph: svc.requires_photograph,
      requires_signature: svc.requires_signature,
      requires_appointment: svc.requires_appointment,
      requires_staff: svc.requires_staff,
      requires_worker: svc.requires_worker,
      delivery_available: svc.delivery_available,
      pickup_available: svc.pickup_available,
      payment_required: svc.payment_required,
      is_seasonal: !!svc.is_seasonal,
      season_months: svc.season_months || [],
      season_label: svc.season_label || "",
      is_active: svc.is_active,
    });
    setOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) {
      showToast.error("Service name is required");
      return;
    }
    setSaving(true);
    const payload = { ...form };
    try {
      if (editing) {
        await api(`/services/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast.success("Service updated");
      } else {
        await api("/services", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast.success("Service created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (svc: Service) => {
    try {
      await api(`/services/${svc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !svc.is_active }),
      });
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to toggle");
    }
  };

  const remove = async (svc: Service) => {
    if (!confirm(`Delete service "${svc.name}"? This cannot be undone.`)) return;
    try {
      await api(`/services/${svc.id}`, { method: "DELETE" });
      showToast.success("Service deleted");
      await load();
    } catch (err: any) {
      showToast.error(err.message || "Failed to delete");
    }
  };

  const createCategory = async () => {
    if (!catName.trim()) {
      showToast.error("Category name is required");
      return;
    }
    setCatSaving(true);
    try {
      const cat = await api<ServiceCategory>("/services/categories", {
        method: "POST",
        body: JSON.stringify({ name: catName.trim(), icon: catIcon.trim() || undefined }),
      });
      setCategories((c) => [...c, cat]);
      showToast.success("Category created");
      setCatName("");
      setCatIcon("");
      setCatOpen(false);
    } catch (err: any) {
      showToast.error(err.message || "Failed to create category");
    } finally {
      setCatSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage the service catalogue, pricing & requirements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Category
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Service
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          All ({services.length})
        </button>
        {categories.map((cat) => {
          const count = services.filter((s) => s.category_id === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`rounded-full px-4 py-1.5 text-sm ${filter === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-40 animate-pulse" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No services found. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((svc) => {
            const chip = svc.verification_status.replace(/_/g, " ");
            const chipVariant =
              svc.verification_status === "verified"
                ? "success"
                : svc.verification_status === "needs_review"
                  ? "warning"
                  : svc.verification_status === "suspended"
                    ? "destructive"
                    : "outline";
            return (
              <Card key={svc.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{svc.name}</h3>
                    <Badge variant={svc.is_active ? "success" : "secondary"}>
                      {svc.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">
                    {svc.short_description || svc.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="outline">{svc.price_type}</Badge>
                    {svc.quotation_required && <Badge variant="info">Quote required</Badge>}
                    {svc.requires_physical_presence && (
                      <Badge variant="warning">
                        <MapPin className="mr-1 h-3 w-3" /> Physical
                      </Badge>
                    )}
                    {svc.requires_biometric && (
                      <Badge variant="warning">
                        <ScanFace className="mr-1 h-3 w-3" /> Biometric
                      </Badge>
                    )}
                    {svc.requires_appointment && (
                      <Badge variant="info">
                        <Calendar className="mr-1 h-3 w-3" /> Appointment
                      </Badge>
                    )}
                    {svc.delivery_available && (
                      <Badge variant="outline">
                        <Truck className="mr-1 h-3 w-3" /> Delivery
                      </Badge>
                    )}
                    {svc.pickup_available && (
                      <Badge variant="outline">
                        <PackageOpen className="mr-1 h-3 w-3" /> Pickup
                      </Badge>
                    )}
                    {svc.official_provider && (
                      <Badge variant="secondary">via {svc.official_provider}</Badge>
                    )}
                  </div>
                  <Badge variant={chipVariant as any} className="mt-2 self-start capitalize">
                    {chip}
                  </Badge>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      {svc.price_type === "fixed" ? (
                        <p className="font-bold text-primary">
                          {formatNaira(svc.base_price)}
                          <span className="text-xs text-muted-foreground"> / {svc.price_unit}</span>
                        </p>
                      ) : svc.price_type === "range" ? (
                        <p className="font-bold text-primary">
                          {formatNaira(svc.minimum_price || 0)}–{formatNaira(svc.maximum_price || 0)}
                        </p>
                      ) : (
                        <p className="font-bold text-primary">Quotation</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => toggleActive(svc)}>
                        {svc.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openEdit(svc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(svc)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "New Service"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modify the service configuration." : "Create a configurable service for the catalogue."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Service name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. JAMB Registration Assistance" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icon (lucide name, optional)</Label>
                <Input value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="e.g. BookOpen" />
              </div>
              <div className="sm:col-span-2">
                <Label>Short description</Label>
                <Input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Full description</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Pricing</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Price type</Label>
                  <Select value={form.price_type} onValueChange={(v) => set("price_type", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Price type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.price_type === "fixed" ? (
                  <div>
                    <Label>Base price</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.base_price}
                      onChange={(e) => set("base_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Min price</Label>
                      <Input
                        type="number"
                        value={form.minimum_price ?? ""}
                        onChange={(e) => set("minimum_price", e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                    <div>
                      <Label>Max price</Label>
                      <Input
                        type="number"
                        value={form.maximum_price ?? ""}
                        onChange={(e) => set("maximum_price", e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                  </>
                )}
                <Toggle
                  checked={form.quotation_required}
                  onChange={(v) => set("quotation_required", v)}
                  label="Quotation required"
                />
                <div>
                  <Label>Unit (optional)</Label>
                  <Input value={form.price_unit} onChange={(e) => set("price_unit", e.target.value)} placeholder="page / project / hr" />
                </div>
                <div>
                  <Label>Est. processing time</Label>
                  <Input value={form.estimated_processing_time} onChange={(e) => set("estimated_processing_time", e.target.value)} placeholder="e.g. 2–3 business days" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Requirements</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                {REQUIREMENT_FIELDS.map((f) => (
                  <Toggle
                    key={f.key}
                    checked={form[f.key as keyof FormState] as boolean}
                    onChange={(v) => set(f.key as keyof FormState, v as never)}
                    label={f.label}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Requirements (list)</Label>
                <ListInput value={form.requirements} onChange={(v) => set("requirements", v)} placeholder="e.g. Valid email address" />
              </div>
              <div>
                <Label>Required documents</Label>
                <ListInput value={form.required_documents} onChange={(v) => set("required_documents", v)} placeholder="e.g. National ID" />
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Logistics</h4>
              <div className="flex flex-wrap gap-4">
                {LOGISTIC_FIELDS.map((f) => (
                  <Toggle
                    key={f.key}
                    checked={form[f.key as keyof FormState] as boolean}
                    onChange={(v) => set(f.key as keyof FormState, v as never)}
                    label={f.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Seasonality (spec 61)</h4>
              <div className="space-y-3">
                <Toggle
                  checked={form.is_seasonal}
                  onChange={(v) => set("is_seasonal", v)}
                  label="Seasonal service (e.g. JAMB/UTME)"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>In-season months (1-12, comma separated)</Label>
                    <Input
                      value={form.season_months.join(",")}
                      onChange={(e) =>
                        set("season_months", e.target.value.split(",").map((m) => parseInt(m.trim(), 10)).filter((m) => m >= 1 && m <= 12))
                      }
                      placeholder="1,2,3,4,5"
                      disabled={!form.is_seasonal}
                    />
                  </div>
                  <div>
                    <Label>Season label</Label>
                    <Input
                      value={form.season_label}
                      onChange={(e) => set("season_label", e.target.value)}
                      placeholder="JAMB/UTME season (Jan-May)"
                      disabled={!form.is_seasonal}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Commission</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Commission type</Label>
                  <Select value={form.commission_type} onValueChange={(v) => set("commission_type", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{form.commission_type === "percentage" ? "Commission %" : "Commission (₦)"}</Label>
                  <Input
                    type="number"
                    value={form.commission_value}
                    onChange={(e) => set("commission_value", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold">Official provider (government / third-party)</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Provider name</Label>
                  <Input value={form.official_provider} onChange={(e) => set("official_provider", e.target.value)} placeholder="e.g. JAMB" />
                </div>
                <div>
                  <Label>Provider URL</Label>
                  <Input value={form.official_provider_url} onChange={(e) => set("official_provider_url", e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>Official fee</Label>
                  <Input type="number" value={form.official_fee ?? ""} onChange={(e) => set("official_fee", e.target.value ? parseFloat(e.target.value) : null)} />
                </div>
                <div>
                  <Label>DE-PRINCE fee</Label>
                  <Input type="number" value={form.deprince_fee ?? ""} onChange={(e) => set("deprince_fee", e.target.value ? parseFloat(e.target.value) : null)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Verification status</Label>
                  <Select value={form.verification_status} onValueChange={(v) => set("verification_status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VERIFICATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label>Service instructions</Label>
              <Textarea value={form.service_instructions} onChange={(e) => set("service_instructions", e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {editing ? "Save changes" : "Create service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={(o) => { if (!o) setCatOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
            <DialogDescription>Create a service category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category name</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. JAMB & Admission" />
            </div>
            <div>
              <Label>Icon (optional)</Label>
              <Input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} placeholder="lucide icon name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)} disabled={catSaving}>
              Cancel
            </Button>
            <Button onClick={createCategory} disabled={catSaving}>
              {catSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
