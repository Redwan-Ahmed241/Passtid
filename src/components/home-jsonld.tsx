import { JsonLd } from "@/components/json-ld";
import { content } from "@/lib/i18n/content";
import { ids } from "@/lib/seo";
import { site } from "@/lib/site";
import type { Lang } from "@/lib/i18n/translations";

const LOCALE = { en: "en-GB", sv: "sv-SE" } as const satisfies Record<Lang, string>;

/** The app and FAQ structured data of a home page, in the language of that page. */
export function HomeJsonLd({ lang, path }: { lang: Lang; path: string }) {
  return (
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
            publisher: { "@id": ids.organization },
            isPartOf: { "@id": ids.website },
            operatingSystem: "Web",
            inLanguage: LOCALE[lang],
          },
          {
            "@type": "FAQPage",
            "@id": `${site.url}${path}#faq`,
            inLanguage: LOCALE[lang],
            mainEntity: content[lang].faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ],
      }}
    />
  );
}
