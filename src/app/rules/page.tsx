import type { Metadata } from "next";
import { baseOpenGraph } from "@/lib/seo";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { RulesView } from "@/components/rules-view";
import { features } from "@/lib/features";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How slots are matched to your booking window",
  description:
    "How Passtid matches Swedish embassy slots in London to your booking window, what happens when a booking fails, and why the rules are the same for every service.",
  alternates: { canonical: "/rules" },
  openGraph: { ...baseOpenGraph, url: "/rules" },
};

export default function RulesPage() {
  // Built but hidden for now. Set NEXT_PUBLIC_SHOW_RULES=true and redeploy to show it.
  if (!features.rules) notFound();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
            { "@type": "ListItem", position: 2, name: "Booking rules", item: `${site.url}/rules` },
          ],
        }}
      />

      <RulesView />
    </>
  );
}
