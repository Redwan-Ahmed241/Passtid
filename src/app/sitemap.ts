import type { MetadataRoute } from "next";
import { features } from "@/lib/features";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    // Hidden pages stay out of the sitemap until they are switched on.
    ...(features.rules ? [{ url: `${site.url}/rules`, changeFrequency: "monthly" as const, priority: 0.7 }] : []),
    { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
