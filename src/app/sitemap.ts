import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/console`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/rules`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
