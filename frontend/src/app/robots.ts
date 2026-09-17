import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/orders", "/wallet", "/profile", "/messages", "/notifications", "/use", "/verifications", "/appointments", "/quotations", "/subscriptions", "/referrals", "/support", "/privacy", "/computers", "/printing", "/workers"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}