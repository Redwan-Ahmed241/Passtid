"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { MAX_FEEDBACK_MESSAGE, MAX_FEEDBACK_NAME, type Feedback, type FeedbackStatus } from "@/lib/types";

const STATUS_KEYS: Record<FeedbackStatus, TranslationKey> = {
  waiting: "fbWaiting",
  published: "fbPublished",
  hidden: "fbHidden",
};

/** Lets a paying customer rate the service. Renders nothing for anyone else. */
export function FeedbackBox({ startOpen = false }: { startOpen?: boolean }) {
  const { t } = useI18n();
  const uid = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const [eligible, setEligible] = useState(false);
  const [saved, setSaved] = useState<Feedback | null>(null);
  const [open, setOpen] = useState(startOpen);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [allowPublic, setAllowPublic] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    api.myFeedback().then(
      (r) => {
        setEligible(r.eligible);
        if (!r.feedback) return;
        setSaved(r.feedback);
        setRating(r.feedback.rating);
        setMessage(r.feedback.message);
        setName(r.feedback.name);
        setAllowPublic(r.feedback.allowPublic);
      },
      () => {
        /* feedback is optional; booking works without it */
      },
    );
  }, []);

  // Opened from a "leave feedback" link: bring the form into view once we know it applies.
  useEffect(() => {
    if (startOpen && eligible) sectionRef.current?.scrollIntoView({ block: "start" });
  }, [startOpen, eligible]);

  if (!eligible) return null;

  const missing = { rating: rating === 0, message: message.trim().length < 10, name: name.trim() === "" };
  const changed = () => setSent(false);

  const submit = async () => {
    if (missing.rating || missing.message || missing.name) {
      setShowErrors(true);
      return;
    }
    setSending(true);
    setFailed(null);
    try {
      setSaved(await api.saveFeedback({ rating, message: message.trim(), name: name.trim(), allowPublic }));
      setSent(true);
      setShowErrors(false);
    } catch (err) {
      setFailed(err instanceof ApiRequestError ? err.message : t("fbFail"));
    } finally {
      setSending(false);
    }
  };

  const error = (show: boolean, key: TranslationKey) =>
    showErrors && show && (
      <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{t(key)}</p>
    );

  return (
    <section ref={sectionRef} aria-labelledby={`${uid}-h`} className="mt-6 scroll-mt-24 border-t border-line pt-6">
      {!open ? (
        <button
          type="button"
          id={`${uid}-h`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent hover:text-accent-ink"
          onClick={() => setOpen(true)}
        >
          <Star className="size-4" aria-hidden="true" />
          {t("fbOpen")}
        </button>
      ) : (
        <form
          className="max-w-xl"
          noValidate
          onChange={changed}
          onSubmit={(e) => {
            e.preventDefault();
            if (!sending) void submit();
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${uid}-h`} className="text-lg font-bold text-ink">{t("fbTitle")}</h2>
            <button type="button" className="min-h-11 text-sm font-semibold text-accent hover:text-accent-ink" onClick={() => setOpen(false)}>
              {t("close")}
            </button>
          </div>
          {saved && <p className="text-sm text-muted">{t(STATUS_KEYS[saved.status])}</p>}

          <fieldset className="mt-4">
            <legend className="mb-1 text-sm font-medium text-ink-2">{t("fbRating")}</legend>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="grid size-11 cursor-pointer place-items-center rounded-lg has-focus-visible:outline-2 has-focus-visible:outline-accent">
                  <input type="radio" name={`${uid}-rating`} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
                  <Star aria-hidden="true" className={`size-7 transition-colors ${n <= rating ? "fill-yellow text-busy" : "text-line-strong"}`} />
                  <span className="sr-only">{t("fbStars", { n })}</span>
                </label>
              ))}
            </div>
            {error(missing.rating, "fbErrRating")}
          </fieldset>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">{t("fbMessage")}</span>
            <textarea
              className="field min-h-28 resize-y"
              maxLength={MAX_FEEDBACK_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={showErrors && missing.message}
            />
          </label>
          {error(missing.message, "fbErrMessage")}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">{t("fbName")}</span>
            <input
              className="field"
              autoComplete="given-name"
              maxLength={MAX_FEEDBACK_NAME}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={showErrors && missing.name}
            />
          </label>
          {error(missing.name, "fbErrName")}

          <label className="mt-4 flex min-h-11 items-start gap-3 text-sm text-ink-2">
            <input type="checkbox" className="mt-0.5 size-5 flex-none accent-[var(--accent)]" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)} />
            {t("fbConsent")}
          </label>

          {failed && <p role="alert" className="mt-2 text-[0.8125rem] text-hot">{failed}</p>}
          <p role="status" className="mt-2 text-sm text-clear">{sent ? t("fbThanks") : ""}</p>
          <button type="submit" className="btn btn-primary mt-2" disabled={sending}>
            {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t(saved ? "fbUpdate" : "fbSend")}
          </button>
        </form>
      )}
    </section>
  );
}
