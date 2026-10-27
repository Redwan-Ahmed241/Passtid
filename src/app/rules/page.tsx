import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { RulesView } from "@/components/rules-view";
import { features } from "@/lib/features";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Booking rules: windows, queue counts and edge cases",
  description:
    "Exactly how Passtid matches Swedish embassy slots to your booking window, what counts as being in the queue, and what happens when a booking fails, with the same rules for passports, ID cards and migration (coordination numbers).",
  alternates: { canonical: "/rules" },
  openGraph: { url: "/rules" },
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
