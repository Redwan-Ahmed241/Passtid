import { JsonLd } from "@/components/json-ld";
import { content } from "@/lib/i18n/content";
import { applyOverrides } from "@/lib/i18n/overrides";
import { savedTexts } from "@/server/saved-texts";
import { ids } from "@/lib/seo";
import { site } from "@/lib/site";
import type { Lang } from "@/lib/i18n/translations";

const LOCALE = { en: "en-GB", sv: "sv-SE" } as const satisfies Record<Lang, string>;

/** The app and FAQ structured data of a home page, in the language of that page. */
export async function HomeJsonLd({ lang, path, description }: { lang: Lang; path: string; description: string }) {
  // The same wording the visitor sees, including anything changed in Admin.
  const { faq } = applyOverrides(content[lang], "c", (await savedTexts())[lang]);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebApplication",
            "@id": ids.app,
            name: site.name,
            url: path === "/" ? site.url : `${site.url}${path}`,
            image: `${site.url}/logo.png`,
            description,
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
            mainEntity: faq.map((f) => ({
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
