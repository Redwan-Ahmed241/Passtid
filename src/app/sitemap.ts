import type { MetadataRoute } from "next";
import { features } from "@/lib/features";
import { homeAlternates, questionsAlternates } from "@/lib/seo";
import { CHECKED } from "@/lib/questions";
import { site } from "@/lib/site";

/**
 * When each page's content last changed. Fixed dates rather than the build time, so a redeploy
 * doesn't tell crawlers every page changed. Update a date when you edit that page's copy.
 */
const updated = {
  home: "2026-11-27",
  rules: "2026-11-03",
  privacy: "2026-11-03",
  terms: "2026-11-03",
} as const;

/** The English and Swedish home pages list each other, as hreflang requires. */
const homeLanguages = Object.fromEntries(
  Object.entries(homeAlternates).map(([lang, path]) => [lang, `${site.url}${path}`]),
);

const questionLanguages = Object.fromEntries(
  Object.entries(questionsAlternates).map(([lang, path]) => [lang, `${site.url}${path}`]),
);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, lastModified: updated.home, changeFrequency: "monthly", priority: 1, alternates: { languages: homeLanguages } },
    { url: `${site.url}/sv`, lastModified: updated.home, changeFrequency: "monthly", priority: 0.9, alternates: { languages: homeLanguages } },
    { url: `${site.url}/questions`, lastModified: CHECKED, changeFrequency: "monthly", priority: 0.8, alternates: { languages: questionLanguages } },
    { url: `${site.url}/sv/fragor`, lastModified: CHECKED, changeFrequency: "monthly", priority: 0.7, alternates: { languages: questionLanguages } },
    // Hidden pages stay out of the sitemap until they are switched on.
    ...(features.rules
      ? [{ url: `${site.url}/rules`, lastModified: updated.rules, changeFrequency: "monthly" as const, priority: 0.7 }]
      : []),
    { url: `${site.url}/privacy`, lastModified: updated.privacy, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/terms`, lastModified: updated.terms, changeFrequency: "yearly", priority: 0.3 },
  ];
}
