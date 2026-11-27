import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { QUESTIONS_PATHS } from "@/lib/i18n/paths";
import type { Lang } from "@/lib/i18n/translations";
import { CHECKED, SOURCES, questions, type SourceId } from "@/lib/questions";
import { site } from "@/lib/site";

const COPY = {
  en: {
    locale: "en-GB",
    title: "Swedish passport questions, answered for the UK",
    notice: "Passtid is not the embassy. These are our own short summaries. Rules change, so check the official page linked under each answer before you rely on it.",
    checked: "Checked",
    official: "Official source",
    english: "",
    cta: "Need an appointment? Passtid can watch the calendar for you.",
    ctaButton: "Start booking",
    names: { booking: "Booking an appointment", adults: "Passports for adults", faq: "Passport questions", provisional: "Provisional passport", contact: "Embassy contact page", police: "Swedish Police", ukBorder: "GOV.UK: before you travel", ukVisa: "GOV.UK: check visa and ETA" },
  },
  sv: {
    locale: "sv-SE",
    title: "Frågor om svenskt pass för dig i Storbritannien",
    notice: "Passtid är inte ambassaden. Det här är våra egna korta sammanfattningar. Regler ändras, så kontrollera den officiella sidan under varje svar innan du litar på det.",
    checked: "Kontrollerat",
    official: "Officiell källa",
    english: " (på engelska)",
    cta: "Behöver du en tid? Passtid kan bevaka kalendern åt dig.",
    ctaButton: "Starta bokning",
    names: { booking: "Boka tid", adults: "Pass för vuxna", faq: "Frågor om pass", provisional: "Provisoriskt pass", contact: "Ambassadens kontaktsida", police: "Polisen", ukBorder: "GOV.UK: före resan", ukVisa: "GOV.UK: visum och ETA" },
  },
} as const satisfies Record<Lang, { names: Record<SourceId, string> } & Record<string, unknown>>;

/** The questions page in one language, rendered on the server so search engines read all of it. */
export function QuestionsView({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const checked = new Intl.DateTimeFormat(copy.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(CHECKED));
  return (
    <div lang={copy.locale} className="mx-auto max-w-3xl px-4 pt-14 pb-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${site.url}${QUESTIONS_PATHS[lang]}#faq`,
          inLanguage: copy.locale,
          mainEntity: questions[lang].map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a.join(" ") } })),
        }}
      />
      <h1 className="text-3xl leading-tight font-bold text-balance text-ink sm:text-4xl">{copy.title}</h1>
      <p className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-ink-2">{copy.notice}</p>

      <div className="mt-8 divide-y divide-line border-y border-line">
        {questions[lang].map((x) => (
          <section key={x.q} className="py-6">
            <h2 className="text-lg font-semibold text-balance text-ink">{x.q}</h2>
            {x.a.map((p) => (
              <p key={p} className="mt-2 max-w-[65ch] break-words text-ink-2">{p}</p>
            ))}
            <p className="mt-3 text-sm text-muted">
              {copy.official}:{" "}
              {x.sources.map((id, i) => (
                <span key={id}>
                  {i > 0 && ", "}
                  <a href={SOURCES[id]} rel="noopener noreferrer" target="_blank" className="font-medium text-accent underline underline-offset-2">
                    {copy.names[id]}
                    {copy.english}
                  </a>
                </span>
              ))}
              . {copy.checked} {checked}.
            </p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-ink-2">{copy.cta}</p>
      <Link href="/booking" className="btn btn-primary mt-3">{copy.ctaButton}</Link>
    </div>
  );
}
