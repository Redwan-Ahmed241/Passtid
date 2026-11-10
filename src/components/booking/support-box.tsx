"use client";

import { useEffect, useId, useState } from "react";
import { LifeBuoy, Loader2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { MAX_TICKET_MESSAGE, TICKET_CATEGORIES, type SystemId, type Ticket, type TicketCategory } from "@/lib/types";

const CATEGORY_KEYS: Record<TicketCategory, TranslationKey> = {
  booking: "catBooking",
  payment: "catPayment",
  account: "catAccount",
  other: "catOther",
};

/**
 * Lets a signed-in user report a problem. They get a token to quote, the administrator is
 * notified, and any answer shows up here under "Your reports".
 */
export function SupportBox({ system }: { system: SystemId }) {
  const { t } = useI18n();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<TicketCategory>("booking");
  const [message, setMessage] = useState("");
  const [showError, setShowError] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [sent, setSent] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    api.myTickets().then(
      (r) => setTickets(r.tickets),
      () => {
        /* the list is a convenience; the form still works without it */
      },
    );
  }, []);

  const tooShort = message.trim().length < 10;

  const submit = async () => {
    if (tooShort) {
      setShowError(true);
      return;
    }
    setSending(true);
    setFailed(null);
    try {
      const ticket = await api.createTicket({ category, system, message: message.trim() });
      setSent(ticket);
      setTickets((list) => [ticket, ...list]);
      setMessage("");
      setShowError(false);
    } catch (err) {
      setFailed(err instanceof ApiRequestError ? err.message : t("reportFail"));
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby={`${uid}-h`} className="mt-10 border-t border-line pt-6">
      {!open ? (
        <button
          type="button"
          id={`${uid}-h`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent hover:text-accent-ink"
          onClick={() => setOpen(true)}
        >
          <LifeBuoy className="size-4" aria-hidden="true" />
          {t("reportProblem")}
          {tickets.length > 0 && <span className="font-mono text-xs font-normal text-muted tabular">({tickets.length})</span>}
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${uid}-h`} className="flex items-center gap-2 text-lg font-bold text-ink">
              <LifeBuoy className="size-5 text-accent" aria-hidden="true" />
              {t("reportTitle")}
            </h2>
            <button type="button" className="min-h-11 text-sm font-semibold text-accent hover:text-accent-ink" onClick={() => setOpen(false)}>
              {t("close")}
            </button>
          </div>

          {sent && (
            <p role="status" className="mt-3 border-l-4 border-clear py-1 pl-4 text-sm text-ink-2">
              {t("reportSent")}{" "}
              <strong className="font-mono text-base tracking-wider text-ink">{sent.token}</strong>
            </p>
          )}

          <div role="radiogroup" aria-label={t("reportCategory")} className="mt-4">
            <p className="mb-2 text-sm font-medium text-ink-2">{t("reportCategory")}</p>
            <div className="flex flex-wrap gap-2">
              {TICKET_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={category === c}
                  onClick={() => setCategory(c)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                    category === c
                      ? "border-accent bg-accent text-[var(--on-accent)]"
                      : "border-line-strong bg-surface text-ink-2 hover:border-accent hover:bg-accent-soft"
                  }`}
                >
                  {t(CATEGORY_KEYS[c])}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor={`${uid}-msg`} className="mb-1.5 block text-sm font-medium text-ink-2">
              {t("reportMessage")}
            </label>
            <textarea
              id={`${uid}-msg`}
              className="field min-h-28 resize-y"
              maxLength={MAX_TICKET_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={showError && tooShort}
            />
            {showError && tooShort && (
              <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{t("errReportShort")}</p>
            )}
            {failed && (
              <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{failed}</p>
            )}
          </div>

          <button type="button" className="btn btn-primary mt-4" disabled={sending} onClick={() => void submit()}>
            {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {sending ? t("reportSending") : t("reportSend")}
          </button>

          {tickets.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-ink">{t("yourReports")}</h3>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {tickets.map((tk) => (
                  <li key={tk.token} className="py-3 text-sm">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono font-semibold tracking-wider text-ink">{tk.token}</span>
                      <span className={tk.status === "open" ? "font-medium text-busy" : "font-medium text-clear"}>
                        {t(tk.status === "open" ? "ticketOpen" : "ticketResolved")}
                      </span>
                      <span className="text-muted">{t(CATEGORY_KEYS[tk.category])}</span>
                    </p>
                    <p className="mt-1 break-words whitespace-pre-line text-ink-2">{tk.message}</p>
                    {tk.reply && (
                      <p className="mt-2 border-l-4 border-accent py-0.5 pl-3 break-words whitespace-pre-line text-ink">
                        <span className="block text-xs font-semibold text-muted">{t("supportReply")}</span>
                        {tk.reply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
