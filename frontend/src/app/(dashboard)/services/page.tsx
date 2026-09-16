"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, apiForm } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
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
  Search,
  UploadCloud,
  X,
  FileText,
  PenLine,
  BookOpen,
  Printer,
  Palette,
  CreditCard,
  Building2,
  Globe,
  HardDrive,
  Table2,
  Server,
  ShoppingCart,
  Image,
  Landmark,
  Briefcase,
  Layers,
  Layout,
  Sparkles,
  Wifi,
  Camera,
  Copy,
  GraduationCap,
  Share2,
  Download,
  Cpu,
  List,
  Shield,
  Code,
  Settings,
  Monitor,
  UserRound,
  FilePenLine,
  FileSearch,
  Fingerprint,
  Vote,
  Stamp,
  Plane,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ServiceCategory, Service, Order } from "@/types";

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  academic:   { bg: "from-[#d4a84b] to-[#a87c1e]", icon: "text-amber-800" },
  printing:   { bg: "from-[#2563eb] to-[#1d4ed8]", icon: "text-blue-800" },
  design:     { bg: "from-[#9333ea] to-[#7e22ce]", icon: "text-purple-800" },
  web:        { bg: "from-[#16a34a] to-[#15803d]", icon: "text-green-800" },
  computer:   { bg: "from-[#ea580c] to-[#c2410c]", icon: "text-orange-800" },
  online:     { bg: "from-[#0d9488] to-[#0f766e]", icon: "text-teal-800" },
  jamb:       { bg: "from-[#b91c1c] to-[#991b1b]", icon: "text-red-800" },
  government: { bg: "from-[#d4a84b] to-[#b8860b]", icon: "text-amber-800" },
  fallback:   { bg: "from-[#d4a84b] to-[#a87c1e]", icon: "text-amber-800" },
};

const CATEGORY_MAP: Record<string, string> = {
  "academic services": "academic",
  "printing": "printing",
  "graphic design": "design",
  "web development": "web",
  "computer services": "computer",
  "online services": "online",
  "jamb services": "jamb",
  "government & identity": "government",
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "APA/Formatting":                  FileText,
  "Assignment Typing":               PenLine,
  "Binder (Spiral/Soft/Hard)":       BookOpen,
  "Black & White Printing":          Printer,
  "Colour Printing":                 Printer,
  "Lamination":                      Layers,
  "Photocopying":                    Copy,
  "Scanning":                        FileText,
  "Brand Identity":                  Palette,
  "Business Card":                   CreditCard,
  "Flyer Design":                    Image,
  "Logo Design":                     Sparkles,
  "Social Media Graphics":           Share2,
  "Passport Photography":            Camera,
  "Business Website":                Globe,
  "E-commerce Website":              ShoppingCart,
  "Landing Page":                    Layout,
  "Web Application":                 Code,
  "Website Maintenance":             Settings,
  "Domain & Hosting Setup":          Server,
  "Data Backup":                     HardDrive,
  "Network Configuration":           Wifi,
  "Software Installation":           Download,
  "System Optimization":             Cpu,
  "Virus/Malware Cleanup":           Shield,
  "Windows Installation":            Monitor,
  "Business Registration Assistance": Building2,
  "Government Portal Assistance":    Landmark,
  "Job Application Assistance":      Briefcase,
  "School Application Assistance":   GraduationCap,
  "Data Entry":                      Table2,
  "Project Typing":                  PenLine,
  "Table of Contents":               List,
  "PowerPoint Presentation":         FileText,
  "JAMB/UTME Registration":          GraduationCap,
  "JAMB Profile Creation":           UserRound,
  "JAMB ePIN & Document Printing":   Printer,
  "JAMB Correction of Data":         FilePenLine,
  "JAMB CBT Practice":               Cpu,
  "Post-UTME Registration":          GraduationCap,
  "NIN (National ID) Registration":  Fingerprint,
  "NIN Retrieval / Print":           FileSearch,
  "BVN (Bank Verification Number)":  Fingerprint,
  "CAC Business Registration":       Building2,
  "CAC Business Search":             Search,
  "Voter Registration Booking":      Vote,
  "Verification Centre":             ShieldCheck,
  "NYSC Registration Assistance":    GraduationCap,
  "Document Attestation":            Stamp,
  "Passport Booking Assistance":     Plane,
};

function getServiceIcon(name: string) {
  return SERVICE_ICONS[name] || FileText;
}

function getCategoryColor(catName: string): { bg: string; icon: string } {
  const key = CATEGORY_MAP[catName?.toLowerCase()] || "fallback";
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.fallback;
}

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
      const data = await api<Service[]>("/services");
      setServices(data);
    } catch {
      setServices([]);
    }
  };

  const filteredServices = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.short_description || "").toLowerCase().includes(q)
    );
  }, [services, search]);

  const groupedServices = useMemo(() => {
    const catId = activeCategory;
    if (catId) {
      const cat = categories.find((c) => c.id === catId);
      const filtered = filteredServices.filter((s) => s.category_id === catId);
      return cat ? [{ category: cat, services: filtered }] : [];
    }
    const map = new Map<string, Service[]>();
    for (const s of filteredServices) {
      const key = s.category_id || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .map(([catId, svcs]) => {
        const cat = categories.find((c) => c.id === catId);
        return { category: cat || ({ id: catId, name: "Other", icon: null } as ServiceCategory), services: svcs };
      })
      .sort((a, b) => a.category.name.localeCompare(b.category.name));
  }, [filteredServices, activeCategory, categories]);

  const placeOrder = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: [{ service_id: selected.id, quantity }],
          customer_notes: notes || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
        }),
      });
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        await apiForm(`/orders/${order.id}/files`, fd, "POST");
      }
      showToast.success(`Order ${order.order_number} placed`);
      closeModal();
    } catch (err: any) {
      showToast.error(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setQuantity(1);
    setNotes("");
    setDeadline("");
    setFiles([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Services</h1>
        <p className="text-[#A8A8A8]">
          Choose a service to get started
        </p>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 -mx-1 px-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !activeCategory
              ? "bg-gradient-to-r from-[#E8C879] to-[#B8860B] text-[#0B0B0B] shadow-sm"
              : "bg-[#222] text-[#A8A8A8] hover:bg-[#333]"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-gradient-to-r from-[#E8C879] to-[#B8860B] text-[#0B0B0B] shadow-sm"
                : "bg-[#222] text-[#A8A8A8] hover:bg-[#333]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A8A8]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#D4A84B]/20 bg-[#181818] overflow-hidden">
              <div className="h-28 bg-[#222] animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-[#222] rounded animate-pulse w-3/4" />
                <div className="h-3 bg-[#222] rounded animate-pulse w-full" />
                <div className="h-3 bg-[#222] rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : groupedServices.length === 0 ? (
        <div className="py-16 text-center text-[#A8A8A8]">
          No services found.
        </div>
      ) : (
        groupedServices.map(({ category, services: catServices }) => {
          const colors = getCategoryColor(category.name);
          return (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-5 rounded-full bg-gradient-to-b ${colors.bg}`}
                />
                <h2 className="text-base font-semibold text-white">
                  {category.name}
                </h2>
                <span className="text-xs text-[#A8A8A8]">
                  ({catServices.length})
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catServices.map((service) => {
                  return (
                    <Link
                      key={service.id}
                      href={`/services/${service.slug}`}
                    >
                      <div className="service-card group">
                        <div
                          className={`service-card-header bg-gradient-to-br ${colors.bg}`}
                        >
                          <div className="service-card-icon">
                            <img
                              src="/images/service-default-icon.png"
                              alt={service.name}
                              className="h-10 w-10 object-contain rounded-full"
                            />
                          </div>
                        </div>
                        <div className="service-card-body">
                          <p className="service-card-title">{service.name}</p>
                          <p className="service-card-desc">
                            {service.short_description ||
                              service.description ||
                              "Professional service"}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-sm font-bold text-[#a87c1e]">
                              {formatNaira(service.base_price)}
                              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                                /{service.price_unit}
                              </span>
                            </p>
                            <span className="text-xs font-medium text-[#d4a84b] group-hover:underline">
                              View &rarr;
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {service.is_seasonal && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                {service.season_label || "Seasonal"}
                              </Badge>
                            )}
                            {service.requires_file_upload && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Upload
                              </Badge>
                            )}
                            {service.quotation_required && (
                              <Badge variant="info" className="text-[10px] px-1.5 py-0">
                                Quote
                              </Badge>
                            )}
                            {service.requires_physical_presence && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                Physical
                              </Badge>
                            )}
                            {service.delivery_available && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Delivery
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="max-w-md bg-[#181818] border-[#D4A84B]/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{selected?.name}</DialogTitle>
            <DialogDescription className="text-[#A8A8A8]">
              {selected?.price_type === "fixed"
                ? `${formatNaira(selected?.base_price || 0)} / ${selected?.price_unit}`
                : selected?.price_type === "range"
                  ? `${formatNaira(selected?.minimum_price || 0)} – ${formatNaira(selected?.maximum_price || 0)}`
                  : "Quotation required"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selected?.is_seasonal && selected?.season_label && (
              <div className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-sm text-[#F59E0B]">
                <span className="font-semibold">SEASONAL ·</span>{" "}
                {selected.season_label}
              </div>
            )}
            {(selected?.requires_physical_presence ||
              selected?.requires_biometric) && (
              <div className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-sm text-[#F59E0B]">
                <p className="font-semibold">PHYSICAL PRESENCE REQUIRED</p>
                <p className="mt-1 text-[#F59E0B]/80">
                  {selected?.requires_biometric
                    ? "BIOMETRIC CAPTURE REQUIRED. This must be completed personally through the official / authorized process."
                    : "This service requires a physical visit to an approved centre."}
                </p>
              </div>
            )}
            {selected?.official_provider && (
              <div className="rounded-lg border border-[#D4A84B]/25 bg-[#222] p-3 text-sm">
                <p className="text-[#A8A8A8]">
                  <span className="font-medium text-white">
                    Official provider:
                  </span>{" "}
                  {selected.official_provider}
                  {selected.official_provider_url && (
                    <>
                      {" · "}
                      <a
                        href={selected.official_provider_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#E8C879] underline"
                      >
                        {selected.official_provider_url.replace(
                          /^https?:\/\//,
                          ""
                        )}
                      </a>
                    </>
                  )}
                </p>
                {selected.official_fee != null && (
                  <p className="mt-1 text-[#A8A8A8]">
                    <span className="font-medium text-white">
                      Official fee:
                    </span>{" "}
                    {formatNaira(selected.official_fee)}
                  </p>
                )}
                {selected.deprince_fee != null && (
                  <p className="mt-1 text-[#A8A8A8]">
                    <span className="font-medium text-white">
                      DE-PRINCE service fee:
                    </span>{" "}
                    {formatNaira(selected.deprince_fee)}
                  </p>
                )}
                {selected.official_fee != null &&
                  selected.deprince_fee != null && (
                    <p className="mt-2 border-t border-[#D4A84B]/25 pt-2 font-semibold text-white">
                      TOTAL:{" "}
                      {formatNaira(
                        (selected.official_fee || 0) +
                          (selected.deprince_fee || 0)
                      )}
                    </p>
                  )}
              </div>
            )}
            <div>
              <Label className="text-[#E8E8E8]">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>
            <div>
              <Label className="text-[#E8E8E8]">Instructions</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what you need..."
              />
            </div>
            <div>
              <Label className="text-[#E8E8E8]">Deadline (optional)</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            {selected?.requires_file_upload && (
              <div>
                <Label className="text-[#E8E8E8]">Attach Files</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#D4A84B]/30 p-6 text-center text-sm text-[#A8A8A8] hover:bg-[#222]">
                  <UploadCloud className="mb-2 h-6 w-6" />
                  Click to upload
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      setFiles(Array.from(e.target.files || []))
                    }
                  />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded border border-[#D4A84B]/20 bg-[#222] px-2 py-1 text-sm text-white"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          onClick={() =>
                            setFiles(files.filter((_, idx) => idx !== i))
                          }
                        >
                          <X className="h-4 w-4 text-[#A8A8A8]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={placeOrder}
              disabled={submitting}
              className="w-full"
            >
              {submitting
                ? "Placing order..."
                : selected?.price_type === "fixed"
                  ? `Place Order · ${formatNaira(
                      (selected?.base_price || 0) * quantity
                    )}`
                  : selected?.price_type === "range"
                    ? `Place Order · ${formatNaira(
                        selected?.minimum_price || 0
                      )}+`
                    : "Request Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
