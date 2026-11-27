import type { Metadata } from "next";
import { HomeJsonLd } from "@/components/home-jsonld";
import { HomeView } from "@/components/home-view";
import { baseOpenGraph, homeAlternates } from "@/lib/seo";
import { formatPrice, planFor } from "@/lib/plans";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/", languages: homeAlternates },
  openGraph: { ...baseOpenGraph, url: "/" },
};

export default function Home() {
  return (
    <>
      <HomeJsonLd lang="en" path="/" description={site.description} />
      <HomeView
        prices={{ notify: formatPrice(planFor("notify")), autobook: formatPrice(planFor("autobook")) }}
        monthly={{ notify: planFor("notify").interval === "month", autobook: planFor("autobook").interval === "month" }}
      />
    </>
  );
}
