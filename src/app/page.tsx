import { HomeView } from "@/components/home-view";
import { JsonLd } from "@/components/json-ld";
import { content } from "@/lib/i18n/content";
import { formatPrice, planFor } from "@/lib/plans";
import { ids, languages } from "@/lib/seo";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              "@id": ids.app,
              name: site.name,
              url: site.url,
              image: `${site.url}/logo.png`,
              description: site.description,
              applicationCategory: "UtilitiesApplication",
              creator: { "@type": "Organization", name: site.credit.name, url: site.credit.url },
              publisher: { "@id": ids.organization },
              isPartOf: { "@id": ids.website },
              operatingSystem: "Web",
              inLanguage: languages,
            },
            {
              "@type": "FAQPage",
              mainEntity: content.en.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }}
      />

      <HomeView
        prices={{ notify: formatPrice(planFor("notify")), autobook: formatPrice(planFor("autobook")) }}
        monthly={{ notify: planFor("notify").interval === "month", autobook: planFor("autobook").interval === "month" }}
      />
    </>
  );
}
