"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LOCALES, useI18n } from "@/lib/i18n";
import type { PublicFeedback } from "@/lib/types";
import { RatingStars } from "./rating-stars";

/** Published customer feedback on the home page. Shows nothing at all until there is some. */
export function FeedbackWall() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<PublicFeedback[]>([]);

  useEffect(() => {
    api.publishedFeedback().then(
      (r) => setItems(r.feedback),
      () => {
        /* the page is complete without this section */
      },
    );
  }, []);

  if (items.length === 0) return null;
  const month = new Intl.DateTimeFormat(LOCALES[lang], { month: "long", year: "numeric" });
  return (
    <section id="feedback" aria-labelledby="feedback-h" className="mx-auto max-w-5xl scroll-mt-24 border-t border-line px-4 py-14 sm:px-6 lg:px-8">
      <h2 id="feedback-h" className="text-2xl font-bold text-balance text-ink sm:text-3xl">{t("fbWallTitle")}</h2>
      <p className="mt-2 max-w-[62ch] text-[0.9375rem] text-ink-2">{t("fbWallNote")}</p>
      <ul className={`mt-8 gap-x-12 ${items.length > 1 ? "md:columns-2" : ""}`}>
        {items.map((f, i) => (
          <li key={`${f.updatedAt}-${i}`} className="mb-6 break-inside-avoid border-t border-line pt-5">
            <figure>
              <RatingStars rating={f.rating} label={t("fbStars", { n: f.rating })} />
              <blockquote className={`mt-3 break-words whitespace-pre-line text-ink ${items.length === 1 ? "max-w-[48ch] text-xl leading-relaxed" : "leading-relaxed"}`}>
                {f.message}
              </blockquote>
              <figcaption className="mt-3 text-sm text-muted">
                <span className="font-semibold text-ink-2">{f.name}</span>, {month.format(new Date(f.updatedAt))}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
