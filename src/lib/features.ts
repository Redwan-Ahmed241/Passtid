/**
 * Switches for parts of the site that are built but not shown yet.
 * Each is off unless its environment variable is exactly "true". The values are
 * read at build time, so redeploy after changing one.
 */
export const features = {
  /** The booking rules page (/rules), its links and its sitemap entry. */
  rules: process.env.NEXT_PUBLIC_SHOW_RULES === "true",
} as const;
