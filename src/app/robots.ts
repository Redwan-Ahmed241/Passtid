import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Everything public is crawlable. The API is not for crawlers. The sign-in and booking pages stay
 * crawlable on purpose: they carry a noindex tag, and a crawler can only obey a noindex it is
 * allowed to fetch.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
