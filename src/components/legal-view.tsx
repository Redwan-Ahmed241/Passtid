"use client";

import { useI18n } from "@/lib/i18n";
import { legal, type LegalId } from "@/lib/i18n/legal";
import { site } from "@/lib/site";

/** A plain, flat reading page: no cards, just headings and paragraphs. */
export function LegalView({ id }: { id: LegalId }) {
  const { lang } = useI18n();
  const doc = legal[lang][id];
  const fill = (text: string) => text.replaceAll("{email}", site.contactEmail);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted">{doc.updated}</p>
      <p className="mt-6 text-lg text-ink-2">{doc.intro}</p>
      {doc.sections.map((s, i) => (
        <section key={s.h} className="mt-10">
          <h2 className="text-xl font-semibold text-ink">
            <span className="mr-2 font-mono text-base text-accent">{i + 1}.</span>
            {s.h}
          </h2>
          {s.p.map((para) => (
            <p key={para} className="mt-3 text-ink-2">
              {fill(para)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
