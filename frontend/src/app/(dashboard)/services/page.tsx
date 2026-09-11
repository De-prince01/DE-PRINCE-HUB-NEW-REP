"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, apiForm } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, UploadCloud, X } from "lucide-react";
import type { ServiceCategory, Service, Order } from "@/types";

export default function ServicesPage() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const catParam = searchParams.get("cat");
    if (catParam) setActiveCategory(catParam);
    loadCategories();
  }, [searchParams]);

  useEffect(() => {
    loadServices();
  }, [activeCategory]);

  const loadCategories = async () => {
    try {
      const data = await api<ServiceCategory[]>("/services/categories");
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const query = activeCategory
        ? `/services?category_id=${encodeURIComponent(activeCategory)}`
        : "/services";
      const data = await api<Service[]>("/services");
      setServices(data);
    } catch {
      setServices([]);
    }
  };

  const filteredServices = useMemo(() => {
    if (!search) return services;
    return services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [services, search]);

  const checkOut = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const createData = await api<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: [{ service_id: selected.id, quantity }],
          customer_notes: notes || undefined,
          delivery_address: undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
        }),
      });
      setCreatedOrder(createData);

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));
        await apiForm(`/orders/${createData.id}/files`, formData, "POST");
      }

      showToast.success(`Order ${createData.order_number} created`);
      resetModal();
    } catch (err: any) {
      showToast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setSelected(null);
    setQuantity(1);
    setNotes("");
    setDeadline("");
    setFiles([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-muted-foreground">Choose a service to get started</p>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${!activeCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${activeCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="animate-pulse h-36" /></Card>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No services found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <Link key={service.id} href={`/services/${service.slug}`}>
              <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">
                    {service.short_description || service.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary">{formatNaira(service.base_price)}</p>
                      <p className="text-xs text-muted-foreground">/ {service.price_unit}</p>
                    </div>
                    <Button asChild size="sm">
                      <span>View & Order</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {service.is_seasonal && (
                      <Badge variant="warning">{service.season_label || "Seasonal"}</Badge>
                    )}
                    {service.requires_file_upload && <Badge variant="secondary">Upload</Badge>}
                    {service.quotation_required && <Badge variant="info">Quote required</Badge>}
                    {service.requires_physical_presence && <Badge variant="warning">Physical presence</Badge>}
                    {service.delivery_available && <Badge variant="outline">Delivery</Badge>}
                    {service.estimated_duration && <Badge variant="outline">{service.estimated_duration}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) resetModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.price_type === "fixed"
                ? `${formatNaira(selected?.base_price || 0)} / ${selected?.price_unit}`
                : selected?.price_type === "range"
                  ? `${formatNaira(selected?.minimum_price || 0)} – ${formatNaira(selected?.maximum_price || 0)}`
                  : "Quotation required — we will confirm the price"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selected?.is_seasonal && selected?.season_label && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <span className="font-semibold">SEASONAL ·</span>{" "}
                {selected.season_label}
              </div>
            )}
            {(selected?.requires_physical_presence || selected?.requires_biometric) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">PHYSICAL PRESENCE REQUIRED</p>
                <p className="mt-1 text-amber-700">
                  {selected?.requires_biometric
                    ? "BIOMETRIC CAPTURE REQUIRED. This must be completed personally through the official / authorized process."
                    : "This service requires a physical visit to an approved centre."}
                </p>
              </div>
            )}
            {selected?.official_provider && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Official provider:</span>{" "}
                  {selected.official_provider}
                  {selected.official_provider_url && (
                    <>
                      {" · "}
                      <a
                        href={selected.official_provider_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {selected.official_provider_url.replace(/^https?:\/\//, "")}
                      </a>
                    </>
                  )}
                </p>
                {selected.official_fee != null && (
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">Official fee:</span>{" "}
                    {formatNaira(selected.official_fee)}
                  </p>
                )}
                {selected.deprince_fee != null && (
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">DE-PRINCE service fee:</span>{" "}
                    {formatNaira(selected.deprince_fee)}
                  </p>
                )}
                {selected.official_fee != null && selected.deprince_fee != null && (
                  <p className="mt-2 border-t pt-2 font-semibold">
                    TOTAL CUSTOMER PRICE:{" "}
                    {formatNaira((selected.official_fee || 0) + (selected.deprince_fee || 0))}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what you need..."
              />
            </div>
            <div>
              <Label>Deadline (optional)</Label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            {selected?.requires_file_upload && (
              <div>
                <Label>Attach Files</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/50">
                  <UploadCloud className="mb-2 h-6 w-6" />
                  Click to upload
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                        <span className="truncate">{file.name}</span>
                        <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={checkOut} disabled={submitting} className="w-full">
              {submitting
                ? "Placing order..."
                : selected?.price_type === "fixed"
                  ? `Place Order · ${formatNaira((selected?.base_price || 0) * quantity)}`
                  : selected?.price_type === "range"
                    ? `Place Order · ${formatNaira(selected?.minimum_price || 0)}+`
                    : "Request Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
