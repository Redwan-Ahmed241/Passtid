import type { MetadataRoute } from "next";
import { features } from "@/lib/features";
import { site } from "@/lib/site";

/**
 * When each page's content last changed. Fixed dates rather than the build time, so a redeploy
 * doesn't tell crawlers every page changed. Update a date when you edit that page's copy.
 */
const updated = {
  home: "2026-11-03",
  rules: "2026-11-03",
  privacy: "2026-11-03",
  terms: "2026-11-03",
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, lastModified: updated.home, changeFrequency: "monthly", priority: 1 },
    // Hidden pages stay out of the sitemap until they are switched on.
    ...(features.rules
      ? [{ url: `${site.url}/rules`, lastModified: updated.rules, changeFrequency: "monthly" as const, priority: 0.7 }]
      : []),
    { url: `${site.url}/privacy`, lastModified: updated.privacy, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/terms`, lastModified: updated.terms, changeFrequency: "yearly", priority: 0.3 },
  ];
}
