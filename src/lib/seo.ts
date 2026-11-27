import { OG_ALT, OG_SIZE, OG_TYPE } from "@/lib/og";
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

/**
 * Languages search engines can index. English lives at "/" and Swedish at "/sv", each with
 * its own server-rendered copy, linked to each other with hreflang.
 */
export const languages = ["en-GB", "sv-SE"] as const;

/** hreflang alternates for the home page pair. Paths are relative to metadataBase. */
export const homeAlternates = {
  "en-GB": "/",
  "sv-SE": "/sv",
  "x-default": "/",
} as const;

/**
 * Open Graph fields every page shares. A page's `openGraph` replaces the layout's whole object
 * (metadata merges shallowly), so pages spread this in next to their own `url`. It carries no
 * title or description on purpose: Next fills those, and the Twitter card's, from the page.
 * The share image is listed here because the root `opengraph-image` file only reaches pages that
 * don't set their own `openGraph`.
 */
export const baseOpenGraph = {
  type: "website",
  siteName: site.name,
  locale: site.locale,
  images: [{ url: "/opengraph-image", ...OG_SIZE, type: OG_TYPE, alt: OG_ALT }],
};

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
