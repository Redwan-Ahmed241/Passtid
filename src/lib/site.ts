/**
 * Canonical origin used by the sitemap, robots.txt, canonical links and share images.
 * Set NEXT_PUBLIC_SITE_URL for a custom domain; on Vercel it falls back to the
 * project's production URL so the sitemap never lists localhost.
 */
function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

export const site = {
  name: "Passtid",
  tagline: "Book a slot you can actually attend",
  description:
    "Passtid watches Swedish embassy appointment slots in London for passports, national ID cards and migration (coordination numbers). Set the days and hours you can attend, see how many people are already queued for each slot on a month calendar, and book the quiet one.",
  url: baseUrl(),
  /** Shown in the privacy policy and terms. Set NEXT_PUBLIC_CONTACT_EMAIL to the real support address. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@passtid.com",
  locale: "en_GB",
  /** Every FazeSoft project carries this credit in its footer. */
  credit: { lead: "Built by", name: "FazeSoft", url: "https://www.fazesoft.com/" },
  disclaimer:
    "Passtid is an independent booking assistant. It is not affiliated with, endorsed by or operated by the Embassy of Sweden or the Swedish Migration Agency.",
} as const;
