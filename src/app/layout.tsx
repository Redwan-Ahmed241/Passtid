import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import { JsonLd } from "@/components/json-ld";
import { baseOpenGraph, siteGraph } from "@/lib/seo";
import { SkipLink } from "@/components/skip-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Swedish Embassy Appointment Alerts in London · Passtid",
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.credit.name, url: site.credit.url }],
  creator: site.credit.name,
  publisher: site.name,
  keywords: [
    "Passtid",
    "Swedish embassy London appointment",
    "Swedish passport appointment",
    "Swedish national ID card appointment",
    "coordination number appointment",
    "samordningsnummer",
    "embassy slot booking",
    "boka tid ambassaden London",
    "pass ambassaden London",
  ],
  alternates: { canonical: "/" },
  // No title or description here: Next fills og:title, og:description and the Twitter card's
  // from each page's own title and description. Setting them here would leak to every page.
  openGraph: { ...baseOpenGraph, url: "/" },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Optional extra proof of ownership. The Google HTML file in /public already works.
  ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.GOOGLE_SITE_VERIFICATION,
          other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
        },
      }
    : {}),
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#f4f8fb",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <JsonLd data={siteGraph} />
        <LangProvider>
        <SkipLink />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        </LangProvider>
      </body>
    </html>
  );
}
