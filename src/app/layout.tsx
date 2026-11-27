import { savedTexts } from "@/server/saved-texts";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Insights } from "@/components/insights";
import { LangProvider } from "@/lib/i18n";
import { JsonLd } from "@/components/json-ld";
import { baseOpenGraph, siteGraph } from "@/lib/seo";
import { SkipLink } from "@/components/skip-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

// The font files live in ./fonts (IBM Plex and Newsreader, SIL Open Font License), so the build
// never has to download anything from Google. Latin subset: covers English and Swedish.
const plexSans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-latin-opsz-normal.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/newsreader-latin-opsz-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Swedish Embassy London Appointment Alerts · Passtid",
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  publisher: site.name,
  keywords: [
    "Passtid",
    "Swedish embassy London appointment",
    "book Swedish embassy appointment London",
    "Swedish passport appointment London",
    "renew Swedish passport in London",
    "Swedish ID card appointment London",
    "samordningsnummer appointment London",
    "coordination number Sweden from UK",
    "Swedish embassy appointment alert",
    "Swedish embassy auto booking",
    "boka tid ambassaden London",
    "svenska ambassaden London tidsbokning",
    "lediga tider svenska ambassaden",
    "bevaka lediga tider pass",
    "automatisk bokning ambassad",
    "passtid London",
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const texts = await savedTexts();
  return (
    <html lang="en-GB" className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <JsonLd data={siteGraph} />
        <LangProvider initialTexts={texts}>
        <SkipLink />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        </LangProvider>
        <Insights />
      </body>
    </html>
  );
}
