import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/services/jamb-utme-registration`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/services/government-identity`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/marketplace`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/academy`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/branches`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/track`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/verify`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}