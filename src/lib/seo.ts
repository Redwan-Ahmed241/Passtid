import { site } from "@/lib/site";

/**
 * Structured data shared by every page. Search engines read it to understand who runs the
 * site and what it is, which feeds the knowledge panel, the site name in results and the logo.
 * Per-page data (the app description and FAQ on the home page) lives next to the page.
 */
export const ids = {
  organization: `${site.url}/#organization`,
  website: `${site.url}/#website`,
  app: `${site.url}/#app`,
} as const;

export const languages = ["en-GB", "sv-SE"] as const;

export const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ids.organization,
      name: site.name,
      url: site.url,
      logo: { "@type": "ImageObject", url: `${site.url}/icons/icon-512.png`, width: 512, height: 512 },
      image: `${site.url}/logo.png`,
      description: site.description,
    },
    {
      "@type": "WebSite",
      "@id": ids.website,
      url: site.url,
      name: site.name,
      description: site.description,
      inLanguage: languages,
      publisher: { "@id": ids.organization },
    },
  ],
} as const;
