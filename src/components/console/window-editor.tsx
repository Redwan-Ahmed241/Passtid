"use client";

import { useId, useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { makeId } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { BookingWindow, DateRange, TimeRange } from "@/lib/types";
import { SaveBadge, type SaveState } from "./save-badge";
import { describeDates, describeTimes, emptyRange, MAX_DATE_RANGES, validateWindow } from "@/lib/window";

interface Props {
  value: BookingWindow;
  today: string;
  horizon: string;
  save: SaveState;
  onChange: (next: BookingWindow) => void;
  /** Rendered at the bottom of the card, e.g. the confirm button. */
  footer?: React.ReactNode;
}

/** The three time-of-day choices. They map onto the same time ranges the API already understands. */
const TIME_OPTIONS: { id: "morning" | "afternoon" | "anytime"; label: TranslationKey; hint: TranslationKey; times: TimeRange[] }[] = [
  { id: "morning", label: "morning", hint: "morningHint", times: [{ start: "SOD", end: "12:00" }] },
  { id: "afternoon", label: "afternoon", hint: "afternoonHint", times: [{ start: "12:00", end: "EOD" }] },
  { id: "anytime", label: "anytime", hint: "anytimeHint", times: [] },
];

const sameTimes = (a: TimeRange[], b: TimeRange[]) =>
  a.length === b.length && a.every((x, i) => x.start === b[i].start && x.end === b[i].end);

export function WindowEditor({ value, today, horizon, save, onChange, footer }: Props) {
  const uid = useId();
  const { t } = useI18n();
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const issues = validateWindow(value);
  const issueFor = (field: string) => (touched.has(field) ? issues.find((i) => i.field === field) : undefined);
  const touch = (field: string) => setTouched((s) => (s.has(field) ? s : new Set(s).add(field)));

  const setRange = (i: number, patch: Partial<DateRange>) =>
    onChange({ ...value, ranges: value.ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const addRange = () => onChange({ ...value, ranges: [...value.ranges, emptyRange(makeId(), today, null)] });
  const removeRange = (i: number) => onChange({ ...value, ranges: value.ranges.filter((_, j) => j !== i) });

  return (
    <section aria-labelledby={`${uid}-h`} className="min-w-0">
      {/* As soon as possible comes first: when it is on, the date ranges below are ignored. */}
      <label
        htmlFor={`${uid}-asap`}
        className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
          value.emergency ? "border-hot-line bg-hot-bg" : "border-line bg-surface-2 hover:border-line-strong"
        }`}
      >
        <span className="relative mt-0.5 inline-flex flex-none">
          <input
            id={`${uid}-asap`}
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={value.emergency}
            onChange={(e) => onChange({ ...value, emergency: e.target.checked })}
          />
          <span
            aria-hidden="true"
            className="h-6 w-10 rounded-full bg-line-strong transition-colors peer-checked:bg-hot peer-focus-visible:shadow-[var(--focus)]"
          />
          <span
            aria-hidden="true"
            className="absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform duration-200 peer-checked:translate-x-4"
          />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Zap className={`size-3.5 flex-none ${value.emergency ? "text-hot" : "text-muted"}`} aria-hidden="true" />
            {t("asapTitle")}
          </span>
          <span className="mt-0.5 block text-[0.8125rem] text-muted">{t("asapHelp")}</span>
        </span>
      </label>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={`${uid}-h`} className="label-mono">{t("datesAndTimes")}</h2>
        <SaveBadge state={issues.length > 0 ? "invalid" : save} />
      </div>
      <p className="mt-2 text-[0.8125rem] text-muted">{t("windowIntro")}</p>
      {issues.length > 0 && <p className="mt-2 text-[0.8125rem] text-hot">{t("fixFields")}</p>}

      <fieldset className="mt-4 min-w-0 space-y-4 border-0 p-0 disabled:opacity-50" disabled={value.emergency}>
        <legend className="sr-only">{t("datesAndTimes")}</legend>
        {value.ranges.map((r, i) => (
          <RangeCard
            key={r.id}
            index={i}
            range={r}
            uid={`${uid}-r${i}`}
            today={today}
            horizon={horizon}
            canRemove={value.ranges.length > 1}
            issueFor={issueFor}
            touch={touch}
            onChange={(patch) => setRange(i, patch)}
            onRemove={() => removeRange(i)}
          />
        ))}

        {value.ranges.length === 0 && (
          <p className="rounded-xl border border-dashed border-line-strong px-3 py-3 text-sm text-muted">{t("noRangeYet")}</p>
        )}

        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-accent hover:text-accent-ink disabled:opacity-50"
          disabled={value.ranges.length >= MAX_DATE_RANGES}
          onClick={addRange}
        >
          <Plus className="size-4 flex-none" aria-hidden="true" /> {t("addDateRange")}
        </button>
        {!value.emergency && issueFor("ranges") && (
          <p role="alert" className="text-[0.8125rem] text-hot">{t("errAddRange")}</p>
        )}
      </fieldset>

      {footer && <div className="mt-5 border-t border-line-2 pt-5">{footer}</div>}
    </section>
  );
}

function RangeCard({
  index,
  range: r,
  uid,
  today,
  horizon,
  canRemove,
  issueFor,
  touch,
  onChange,
  onRemove,
}: {
  index: number;
  range: DateRange;
  uid: string;
  today: string;
  horizon: string;
  canRemove: boolean;
  issueFor: (field: string) => { message: string; key?: TranslationKey } | undefined;
  touch: (field: string) => void;
  onChange: (patch: Partial<DateRange>) => void;
  onRemove: () => void;
}) {
  const { t, lang } = useI18n();
  const fromIssue = issueFor(`ranges.${index}.from`);
  const toIssue = issueFor(`ranges.${index}.to`);
  const selected = TIME_OPTIONS.find((o) => sameTimes(o.times, r.times))?.id ?? null;
  const msg = (i: { message: string; key?: TranslationKey }) => (i.key ? t(i.key) : i.message);

  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2 p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold text-ink">{t("dateRangeN", { n: index + 1 })}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("removeRangeN", { n: index + 1 })}
            className="-my-2 -mr-2 grid size-11 flex-none place-items-center rounded-lg text-muted transition-colors hover:bg-hot-bg hover:text-hot"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${uid}-from`} className="mb-1.5 block text-sm font-medium text-ink-2">{t("from")}</label>
          <input
            id={`${uid}-from`}
            type="date"
            className="field font-mono text-[0.9375rem] tabular"
            value={r.from ?? ""}
            min={today}
            max={horizon}
            onChange={(e) => onChange({ from: e.target.value || null })}
            onBlur={() => touch(`ranges.${index}.from`)}
            aria-invalid={!!fromIssue}
            aria-describedby={fromIssue ? `${uid}-from-err` : `${uid}-desc`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${uid}-to`} className="mb-1.5 block text-sm font-medium text-ink-2">{t("to")}</label>
          <input
            id={`${uid}-to`}
            type="date"
            className="field font-mono text-[0.9375rem] tabular"
            value={r.to ?? ""}
            min={r.from || today}
            max={horizon}
            onChange={(e) => onChange({ to: e.target.value || null })}
            onBlur={() => touch(`ranges.${index}.to`)}
            aria-invalid={!!toIssue}
            aria-describedby={toIssue ? `${uid}-to-err` : `${uid}-desc`}
          />
        </div>
      </div>
      {fromIssue && <FieldError id={`${uid}-from-err`}>{msg(fromIssue)}</FieldError>}
      {toIssue && <FieldError id={`${uid}-to-err`}>{msg(toIssue)}</FieldError>}

      {r.from && r.to !== r.from && (
        <button
          type="button"
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-accent-ink"
          onClick={() => onChange({ to: r.from })}
        >
          {t("onlyThisDay")}
        </button>
      )}

      <div role="radiogroup" aria-label={t("timeOfDay")} className="mt-3 border-t border-line pt-3">
        <p className="mb-2 text-sm font-medium text-ink-2">{t("timeOfDay")}</p>
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
          {TIME_OPTIONS.map((o) => {
            const on = selected === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ times: o.times })}
                className={`flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors min-[480px]:min-h-14 min-[480px]:flex-col min-[480px]:justify-center min-[480px]:gap-0 min-[480px]:px-1.5 min-[480px]:text-center ${
                  on
                    ? "border-accent bg-accent text-[var(--on-accent)]"
                    : "border-line bg-surface text-ink-2 hover:border-accent-line hover:bg-accent-soft"
                }`}
              >
                <span className="max-w-full text-sm font-semibold break-words">{t(o.label)}</span>
                <span className={`max-w-full text-[0.6875rem] break-words ${on ? "opacity-85" : "text-muted"}`}>{t(o.hint)}</span>
              </button>
            );
          })}
        </div>
        {selected === null && <p className="mt-2 text-xs text-muted">{t("customTimes")}</p>}
      </div>

      <p id={`${uid}-desc`} className="mt-3 text-[0.8125rem] text-muted">
        {t("means")} <span className="font-medium text-ink-2">{describeDates(r, lang)}</span>, {describeTimes(r, lang)}.
      </p>
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] text-hot">
      <span
        aria-hidden="true"
        className="mt-[3px] grid size-3.5 flex-none place-items-center rounded-full bg-hot text-[9px] font-bold text-surface"
      >
        !
      </span>
      {children}
    </p>
  );
}
