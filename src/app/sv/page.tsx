import type { Metadata } from "next";
import { HomeJsonLd } from "@/components/home-jsonld";
import { HomeView } from "@/components/home-view";
import { baseOpenGraph, homeAlternates } from "@/lib/seo";
import { formatPrice, planFor } from "@/lib/plans";

/** The Swedish home page: the same page as "/", server-rendered in Swedish so it can be indexed. */
export const metadata: Metadata = {
  title: { absolute: "Boka tid på svenska ambassaden i London · Passtid" },
  description:
    "Lediga tider på svenska ambassaden i London för pass, ID-kort och samordningsnummer, bevakade dygnet runt. Få avisering eller låt Passtid boka första tiden som passar.",
  alternates: { canonical: "/sv", languages: homeAlternates },
  openGraph: { ...baseOpenGraph, locale: "sv_SE", url: "/sv" },
};

export default function SwedishHome() {
  return (
    <div lang="sv-SE">
      <HomeJsonLd lang="sv" path="/sv" />
      <HomeView
        prices={{ notify: formatPrice(planFor("notify")), autobook: formatPrice(planFor("autobook")) }}
        monthly={{ notify: planFor("notify").interval === "month", autobook: planFor("autobook").interval === "month" }}
      />
    </div>
  );
}
