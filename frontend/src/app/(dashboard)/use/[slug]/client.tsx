"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiForm } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, UploadCloud, X, ArrowLeft } from "lucide-react";
import type { Service, Order } from "@/types";

export default function ServiceDetailClient({
  slug,
  initial,
}: {
  slug: string;
  initial: Service;
}) {
  const router = useRouter();
  const [service, setService] = useState<Service>(initial);
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<Service>(`/services/by-slug/${encodeURIComponent(slug)}`)
      .then(setService)
      .catch(() => setService(initial));
  }, [slug, initial]);

  const checkOut = async () => {
    setSubmitting(true);
    try {
      const createData = await api<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: [{ service_id: service.id, quantity }],
          customer_notes: notes || undefined,
          delivery_address: undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
        }),
      });
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));
        await apiForm(`/orders/${createData.id}/files`, formData, "POST");
      }
      showToast.success(`Order ${createData.order_number} created`);
      router.push(`/orders/${createData.order_number}`);
    } catch (err: any) {
      showToast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setOpen(false);
    setQuantity(1);
    setNotes("");
    setDeadline("");
    setFiles([]);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to console
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">{service.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.category_name || "Digital service"} · {service.slug}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{formatNaira(service.base_price)}</p>
              <p className="text-xs text-muted-foreground">/ {service.price_unit}</p>
            </div>
          </div>

          <p className="mt-4 text-muted-foreground">
            {service.description || service.short_description}
          </p>

          {service.is_seasonal && service.season_label && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <CalendarRange className="h-4 w-4" />
              <span><span className="font-semibold">SEASONAL ·</span> {service.season_label}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#D4A84B]/40 bg-[#D4A84B]/10 p-4 text-sm">
            <span className="font-semibold text-[#E8C879]">COST ALERT:</span>
            {service.price_type === "fixed" ? (
              <span className="text-white">
                {formatNaira(service.base_price)} / {service.price_unit}
                {service.payment_required ? " — payment required before processing." : ""}
              </span>
            ) : service.price_type === "range" ? (
              <span className="text-white">
                from {formatNaira(service.minimum_price || service.base_price)} — final quote confirmed by our team.
              </span>
            ) : (
              <span className="text-white">Quotation required — we will confirm the exact price.</span>
            )}
            {service.official_fee != null && service.deprince_fee != null && (
              <span className="text-[#A8A8A8]">
                (Official fee {formatNaira(service.official_fee)} + DE-PRINCE service fee {formatNaira(service.deprince_fee)})
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-1">
            {service.requires_file_upload && <Badge variant="secondary">Upload required</Badge>}
            {service.quotation_required && <Badge variant="info">Quote required</Badge>}
            {service.requires_physical_presence && <Badge variant="warning">Physical presence</Badge>}
            {service.requires_biometric && <Badge variant="warning">Biometric required</Badge>}
            {service.requires_appointment && <Badge variant="info">Appointment</Badge>}
            {service.delivery_available && <Badge variant="outline">Delivery</Badge>}
            {service.pickup_available && <Badge variant="outline">Pickup</Badge>}
            {service.estimated_duration && <Badge variant="outline">{service.estimated_duration}</Badge>}
          </div>

          {service.official_provider && (
            <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Official provider:</span>{" "}
                {service.official_provider}
                {service.official_provider_url && (
                  <>
                    {" · "}
                    <a href={service.official_provider_url} target="_blank" rel="noreferrer" className="text-primary underline">
                      {service.official_provider_url.replace(/^https?:\/\//, "")}
                    </a>
                  </>
                )}
              </p>
              {service.official_fee != null && (
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Official fee:</span> {formatNaira(service.official_fee)}
                </p>
              )}
              {service.deprince_fee != null && (
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">DE-PRINCE service fee:</span> {formatNaira(service.deprince_fee)}
                </p>
              )}
              {service.official_fee != null && service.deprince_fee != null && (
                <p className="mt-2 border-t pt-2 font-semibold">
                  TOTAL CUSTOMER PRICE: {formatNaira((service.official_fee || 0) + (service.deprince_fee || 0))}
                </p>
              )}
            </div>
          )}

          <Button className="mt-6 w-full sm:w-auto" onClick={() => setOpen(true)}>
            {service.quotation_required
              ? "Request Quotation"
              : `Order now · ${formatNaira(service.base_price * quantity)}`}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {service.service_instructions && (
          <Card>
            <CardContent className="p-5">
              <h4 className="mb-2 font-semibold">How it works</h4>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{service.service_instructions}</p>
            </CardContent>
          </Card>
        )}
        {service.requirements && service.requirements.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h4 className="mb-2 font-semibold">Requirements</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {service.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {service.required_documents && service.required_documents.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h4 className="mb-2 font-semibold">Required documents</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {service.required_documents.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {(service.faq || []).length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h4 className="mb-2 font-semibold">FAQ</h4>
              {service.faq!.map((f, i) => (
                <div key={i} className="mb-2 text-sm">
                  <p className="font-medium">{f.question || f.q || "Q"}</p>
                  <p className="text-muted-foreground">{f.answer || f.a || ""}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-lg rounded-t-xl bg-background p-6 shadow-xl sm:rounded-xl">
            <h3 className="text-lg font-semibold">{service.name}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {service.price_type === "fixed"
                ? `${formatNaira(service.base_price)} / ${service.price_unit}`
                : service.price_type === "range"
                  ? `${formatNaira(service.minimum_price || 0)} - ${formatNaira(service.maximum_price || 0)}`
                  : "Quotation required - we will confirm the price"}
            </p>
            <div className="space-y-4">
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
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe what you need..." />
              </div>
              <div>
                <Label>Deadline (optional)</Label>
                <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              {service.requires_file_upload && (
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
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={resetModal} className="flex-1">Cancel</Button>
              <Button onClick={checkOut} disabled={submitting} className="flex-1">
                {submitting ? "Placing order..." : "Confirm order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}