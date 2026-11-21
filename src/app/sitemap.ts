import type { MetadataRoute } from "next";
import { getCatalogue } from "@/lib/data/catalogue";
import { siteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { categories, services } = await getCatalogue();
  const staticPaths = ["", "/services", "/help", "/about", "/privacy", "/terms", "/refund-policy", "/disclaimer"];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...categories.map((c) => ({ url: `${base}/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...services.map((s) => ({ url: `${base}/service/${s.slug}`, lastModified: s.updatedAt ? new Date(s.updatedAt) : undefined, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
