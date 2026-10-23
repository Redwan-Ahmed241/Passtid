"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, CreditCard, Globe2, Loader2 } from "lucide-react";
import { api, ApiRequestError, makeId } from "@/lib/api";
import { LOCALES, useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { isComplete } from "@/lib/applicants";
import {
  SYSTEMS,
  isSystemId,
  type BookingRequest,
  type BookingWindow,
  type SlotsResponse,
  type SystemId,
} from "@/lib/types";
import { EMBASSY_TZ, clockOf, dayOf, formatDayLong, formatDayShort } from "@/lib/time";
import { MAX_DATE_RANGES, matchesWindow, parseClock, validateWindow } from "@/lib/window";
import { announceAuthChange, useMe } from "../auth/use-me";
import { ApplicantsEditor } from "./applicants-editor";
import type { SaveState } from "./save-badge";
import { SlotListSkeleton, type ViewSlot } from "./slot-list";
import { WindowEditor } from "./window-editor";

const POLL_SLOTS_MS = 15_000;
const POLL_BOOKING_MS = 1_500;
const DAYS_PER_PAGE = 10;

type Step = 1 | 2 | 3 | 4;
const STEP_KEYS: Record<Step, TranslationKey> = { 1: "stepService", 2: "stepDateTime", 3: "stepDetails", 4: "stepConfirm" };

const sameRequest = (a: BookingRequest, b: BookingRequest) => JSON.stringify(a) === JSON.stringify(b);

/** The window plus one single-day range that covers `slot`, or null when the window is already full. */
function widenWindow(window: BookingWindow, slot: string): BookingWindow | null {
  if (window.ranges.length >= MAX_DATE_RANGES) return null;
  const day = dayOf(slot);
  const h = Math.floor((parseClock(clockOf(slot), "start") ?? 0) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    emergency: false,
    ranges: [
      ...window.ranges,
      { id: makeId(), from: day, to: day, times: [{ start: `${pad(h)}:00`, end: h >= 23 ? "EOD" : `${pad(h + 1)}:00` }] },
    ],
  };
}

let passtidUsers = 0;

/** The console has its own passtid palette; the header and footer follow it. Counted, because the fallback and the page overlap. */
function usePasstidTheme() {
  useEffect(() => {
    passtidUsers += 1;
    document.body.classList.add("passtid");
    return () => {
      passtidUsers -= 1;
      if (passtidUsers === 0) document.body.classList.remove("passtid");
    };
  }, []);
}

const clockFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: EMBASSY_TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function Console() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("system");
  const system: SystemId = requested === "coordination" ? "migration" : isSystemId(requested) ? requested : "passport";
  const { loading: authLoading, user } = useMe();
  const { t, lang } = useI18n();
  const locale = LOCALES[lang];
  const slotLabel = useCallback((iso: string) => `${formatDayShort(iso, locale)} ${clockOf(iso)}`, [locale]);
  const dayShort = (d: string) => formatDayShort(d, locale);
  const dayLong = (d: string) => formatDayLong(d, locale);

  const [step, setStep] = useState<Step>(1);
  /** The person asked to book another service even though this one already has a booking. */
  const [startNew, setStartNew] = useState(false);
  const [consent, setConsent] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<SystemId, BookingRequest>>>({});
  const [saved, setSaved] = useState<Partial<Record<SystemId, BookingRequest>>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [slotsBy, setSlotsBy] = useState<Partial<Record<SystemId, SlotsResponse>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ system: SystemId; slot: string } | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [dayLimit, setDayLimit] = useState(DAYS_PER_PAGE);
  const [working, setWorking] = useState(false);
  const [showDetailErrors, setShowDetailErrors] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string; tone: "ok" | "warn" } | null>(null);

  const announced = useRef(new Set<string>());
  const requestedFor = useRef(new Set<SystemId>());

  /* ----------------------------- helpers ----------------------------- */

  const notify = useCallback((text: string, tone: "ok" | "warn" = "ok") => {
    setToast({ id: Date.now(), text, tone });
  }, []);

  /** A 401 anywhere means the session ended: tell the header and the redirect below takes over. */
  const handleAuthLoss = useCallback((err: unknown) => {
    if (err instanceof ApiRequestError && err.status === 401) {
      announceAuthChange(null);
      return true;
    }
    return false;
  }, []);

  const loadSlots = useCallback(
    (sys: SystemId, signal?: AbortSignal): Promise<SlotsResponse | null> =>
      api.slots(sys, signal).then(
        (res) => {
          setSlotsBy((s) => ({ ...s, [sys]: res }));
          setLoadError(null);
          return res;
        },
        (err: unknown) => {
          if (signal?.aborted || handleAuthLoss(err)) return null;
          setLoadError(err instanceof ApiRequestError ? err.message : t("loadSlotsFail"));
          return null;
        },
      ),
    [handleAuthLoss, t],
  );

  /* ----------------------------- effects ----------------------------- */

  usePasstidTheme();

  // Only signed-in users can see slots.
  useEffect(() => {
    if (authLoading || user) return;
    const search = params.toString();
    router.replace(`/login?next=${encodeURIComponent(search ? `${pathname}?${search}` : pathname)}`);
  }, [authLoading, user, router, pathname, params]);

  // The people, email and window live on the backend per service.
  useEffect(() => {
    if (!user || requestedFor.current.has(system)) return;
    requestedFor.current.add(system);
    api.getRequest(system).then(
      (r) => {
        setDrafts((d) => ({ ...d, [system]: r.request }));
        setSaved((s) => ({ ...s, [system]: r.request }));
      },
      (err: unknown) => {
        requestedFor.current.delete(system);
        if (!handleAuthLoss(err)) setLoadError(t("loadReqFail"));
      },
    );
  }, [system, user, handleAuthLoss, t]);

  // Slots for the active service, refreshed while the tab is visible.
  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();
    void loadSlots(system, ctrl.signal);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadSlots(system);
    }, POLL_SLOTS_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadSlots(system);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ctrl.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [system, user, loadSlots]);

  const draft = drafts[system] ?? null;
  const savedReq = saved[system] ?? null;
  const windowValid = draft ? validateWindow(draft.window).length === 0 : true;
  const detailsReady = draft ? isComplete(system, draft) : false;

  // Autosave once the window is valid and something changed. People and email may still be a draft.
  useEffect(() => {
    if (!draft || !savedReq || sameRequest(draft, savedReq) || validateWindow(draft.window).length) return;
    const t = setTimeout(() => {
      setSaveState("saving");
      api.saveRequest(system, draft).then(
        () => {
          setSaved((s) => ({ ...s, [system]: draft }));
          setSaveState("saved");
        },
        (err: unknown) => {
          if (!handleAuthLoss(err)) setSaveState("error");
        },
      );
    }, 600);
    return () => clearTimeout(t);
  }, [draft, savedReq, system, handleAuthLoss]);

  // Follow every pending booking until it succeeds, fails or is cancelled.
  const pending = useMemo(() => {
    const out: { id: string; system: SystemId; slot: string }[] = [];
    for (const sys of SYSTEMS) {
      for (const s of slotsBy[sys]?.slots ?? []) {
        if (s.mine?.status === "pending") out.push({ id: s.mine.bookingId, system: sys, slot: s.slot });
      }
    }
    return out;
  }, [slotsBy]);
  const pendingKey = pending.map((p) => p.id).join(",");

  useEffect(() => {
    if (!pending.length) return;
    const timer = setInterval(() => {
      for (const p of pending) {
        api
          .booking(p.id)
          .then(async (b) => {
            if (b.status === "pending" || announced.current.has(b.id)) return;
            announced.current.add(b.id);
            const fresh = await loadSlots(b.system);
            const depth = fresh?.slots.find((s) => s.slot === b.slot)?.queued ?? 0;
            if (b.status === "booked") {
              notify(t("nBooked", { slot: slotLabel(b.slot), ref: b.reference ?? "" }));
            } else if (b.reason !== "cancelled") {
              const why = t(b.reason === "timed_out" ? "whyTimeout" : "whyGone");
              notify(t("nFailed", { why, slot: slotLabel(b.slot), depth }), "warn");
            }
          })
          .catch(() => {
            /* transient; the next tick retries */
          });
      }
    }, POLL_BOOKING_MS);
    return () => clearInterval(timer);
    // pendingKey captures the identity of `pending` without re-arming on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, loadSlots, notify]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(t);
  }, [toast]);

  // Each step starts at the top, like turning a page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  /* ----------------------------- derived ----------------------------- */

  // The bot keeps using the last valid window while the draft window is broken.
  const effectiveWindow: BookingWindow | null = draft ? (windowValid ? draft.window : (savedReq?.window ?? null)) : null;
  const data = slotsBy[system];

  const view = useMemo<ViewSlot[]>(() => {
    if (!data || !effectiveWindow) return [];
    return data.slots.map((s) => ({ ...s, inWindow: matchesWindow(s.slot, effectiveWindow) }));
  }, [data, effectiveWindow]);

  const sortedDays = useMemo(() => [...new Set(view.map((s) => dayOf(s.slot)))].sort(), [view]);
  const selectedDay = pickedDay && sortedDays.includes(pickedDay) ? pickedDay : null;
  const daySlots = useMemo(
    () => (selectedDay ? view.filter((s) => dayOf(s.slot) === selectedDay).sort((a, b) => a.slot.localeCompare(b.slot)) : []),
    [view, selectedDay],
  );

  const selectedSlot = selection?.system === system ? (view.find((s) => s.slot === selection.slot) ?? null) : null;
  const mineSlot = view.find((s) => s.mine) ?? null;
  const showStatus = !!mineSlot && !startNew;

  /* ----------------------------- actions ----------------------------- */

  const chooseSystem = (next: SystemId) => {
    if (next !== system) {
      const q = new URLSearchParams(params.toString());
      if (next === "passport") q.delete("system");
      else q.set("system", next);
      const qs = q.toString();
      setPickedDay(null);
      setSelection(null);
      setDayLimit(DAYS_PER_PAGE);
      setShowDetailErrors(false);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    setStartNew(false);
    setStep(2);
  };

  const setDraft = (update: (r: BookingRequest) => BookingRequest) =>
    setDrafts((d) => (d[system] ? { ...d, [system]: update(d[system] as BookingRequest) } : d));

  const pickDay = (day: string) => {
    setPickedDay(day);
    setSelection(null);
    setTimeout(() => document.getElementById("times-h")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const goDetails = () => {
    if (!selectedSlot) return;
    setStep(3);
  };

  /** Step 3 -> 4, or show what is missing. */
  const goConfirm = () => {
    if (!detailsReady || !consent) {
      setShowDetailErrors(true);
      setTimeout(() => {
        document.querySelector<HTMLElement>("#details input[aria-invalid='true']")?.focus();
      }, 50);
      return;
    }
    setStep(4);
  };

  const book = async (slot: ViewSlot) => {
    if (!draft || !effectiveWindow) return;
    if (!detailsReady) {
      setStep(3);
      setShowDetailErrors(true);
      return;
    }
    setWorking(true);
    try {
      // Make sure the backend has the latest people and email, and that the bot's window covers this slot.
      let req: BookingRequest = windowValid ? draft : { ...draft, window: effectiveWindow };
      if (!matchesWindow(slot.slot, req.window)) {
        const wider = widenWindow(req.window, slot.slot);
        if (wider) req = { ...req, window: wider };
      }
      if (!savedReq || !sameRequest(req, savedReq)) {
        await api.saveRequest(system, req);
        setSaved((s) => ({ ...s, [system]: req }));
        setDrafts((d) => ({ ...d, [system]: req }));
      }
      const b = await api.book(system, slot.slot);
      const fresh = await loadSlots(system);
      const depth = fresh?.slots.find((s) => s.slot === b.slot)?.queued ?? slot.queued + 1;
      setSelection({ system, slot: b.slot });
      setStartNew(false);
      const n = req.persons.length;
      notify(t("nQueuedNotify", { slot: slotLabel(b.slot), n, people: t(n === 1 ? "person" : "people"), depth }));
    } catch (err) {
      if (handleAuthLoss(err)) return;
      const message = err instanceof ApiRequestError ? err.message : t("bookFail");
      notify(message, "warn");
      if (err instanceof ApiRequestError && err.status === 404) {
        void loadSlots(system);
        setStep(2);
      }
      if (err instanceof ApiRequestError && err.code === "incomplete_details") {
        setStep(3);
        setShowDetailErrors(true);
      }
    } finally {
      setWorking(false);
    }
  };

  const cancel = async (bookingId: string) => {
    setWorking(true);
    try {
      announced.current.add(bookingId);
      const b = await api.cancel(bookingId);
      const fresh = await loadSlots(b.system);
      const depth = fresh?.slots.find((s) => s.slot === b.slot)?.queued ?? 0;
      notify(t("nCancelled", { slot: slotLabel(b.slot), depth }));
      setConfirmingCancel(false);
      setSelection(null);
      setStep(1);
    } catch (err) {
      announced.current.delete(bookingId);
      if (!handleAuthLoss(err)) notify(err instanceof ApiRequestError ? err.message : t("cancelFail"), "warn");
    } finally {
      setWorking(false);
    }
  };

  /* ----------------------------- render ----------------------------- */

  if (authLoading || !user) return <ConsoleFallback />;

  const ready = !!data && !!draft && !!effectiveWindow;
  const updated = data ? clockFmt.format(new Date(data.generatedAt)) : null;
  const visibleDays = sortedDays.slice(0, dayLimit);

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-16">
      {/* Progress: hidden once there is a booking to look at */}
      {!showStatus && (
        <div className="mb-4">
          <p className="text-xs text-muted tabular" aria-live="polite">
            {step} / 4 · {t(STEP_KEYS[step])}
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {([1, 2, 3, 4] as const).map((n) => (
              <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-accent-line" : "bg-line"}`} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-5">
        {loadError && !data && step > 1 && (
          <div role="alert" className="rounded-xl border border-hot-line bg-hot-bg p-4">
            <p className="flex items-center gap-2 font-semibold text-hot">
              <AlertTriangle className="size-4" aria-hidden="true" /> {t("cantReach")}
            </p>
            <p className="mt-1 text-sm text-ink-2">{loadError}</p>
            <button type="button" className="btn btn-ghost mt-3" onClick={() => void loadSlots(system)}>
              {t("tryAgain")}
            </button>
          </div>
        )}

        {!ready && !loadError && <SlotListSkeleton />}

        {ready && showStatus && mineSlot && draft && (
          <StatusCard
            system={system}
            slot={mineSlot}
            people={draft.persons.length}
            email={draft.email}
            working={working}
            confirming={confirmingCancel}
            onAskCancel={() => setConfirmingCancel(true)}
            onKeep={() => setConfirmingCancel(false)}
            onCancel={() => mineSlot.mine && void cancel(mineSlot.mine.bookingId)}
            onAnother={() => {
              setStartNew(true);
              setStep(1);
            }}
          />
        )}

        {ready && !showStatus && step === 1 && (
          <>
            <h1 className="text-2xl font-semibold text-ink">{t("whatNeed")}</h1>
            <p className="mt-1 text-sm text-muted">{t("bookAppt")}</p>
            <div className="mt-5 flex flex-col gap-3">
              {SYSTEMS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={system === id}
                  onClick={() => chooseSystem(id)}
                  className="flex min-h-20 items-center gap-4 rounded-xl border border-line-strong bg-surface-2 p-4 text-left transition-colors hover:border-accent-line hover:bg-accent-soft aria-pressed:border-accent-line"
                >
                  <span className="grid size-11 flex-none place-items-center rounded-lg bg-accent-soft text-accent-line">
                    {id === "passport" ? <CreditCard className="size-5" aria-hidden="true" /> : <Globe2 className="size-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{t(id === "passport" ? "svcPassport" : "svcCoord")}</span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {t(id === "passport" ? "passportDesc" : "coordDesc")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {ready && !showStatus && step === 2 && data && (
          <>
            <h1 className="text-2xl font-semibold text-ink">{t("chooseDateTime")}</h1>
            <p className="mt-1 text-sm text-muted">{t(system === "passport" ? "svcPassportLong" : "svcCoordLong")}</p>

            {sortedDays.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-line-strong p-5 text-center">
                <p className="font-medium text-ink">{t("noSlotsTitle")}</p>
                <p className="mt-1 text-sm text-muted">
                  {t("noSlotsBody", { n: data.scanWeeks })}
                </p>
              </div>
            ) : (
              <>
                <p className="label-mono mt-5">{t("dateLabel")}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {visibleDays.map((d) => (
                    <button key={d} type="button" className="tile" aria-pressed={selectedDay === d} onClick={() => pickDay(d)}>
                      {dayShort(d)}
                    </button>
                  ))}
                </div>
                {sortedDays.length > dayLimit && (
                  <button
                    type="button"
                    className="mt-3 min-h-11 w-full text-sm font-semibold text-accent-line hover:text-ink"
                    onClick={() => setDayLimit((n) => n + DAYS_PER_PAGE)}
                  >
                    {t("showMoreDates")}
                  </button>
                )}

                {selectedDay && (
                  <>
                    <p id="times-h" className="label-mono mt-5 scroll-mt-20">
                      {t("timeHeading", { d: dayLong(selectedDay) })}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {daySlots.map((s) => (
                        <button
                          key={s.slot}
                          type="button"
                          className="tile"
                          aria-pressed={selectedSlot?.slot === s.slot}
                          onClick={() => setSelection({ system, slot: s.slot })}
                        >
                          <span className="tabular">{clockOf(s.slot)}</span>
                          <span className="text-[0.6875rem] font-normal opacity-75">
                            {s.queued === 0 ? t("noQueue") : t("nQueued", { n: s.queued })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {draft && (
              <details className="group mt-6 rounded-xl border border-line">
                <summary className="flex min-h-11 items-center justify-between px-4 text-sm font-medium text-ink-2">
                  {t("advancedWindow")}
                  <span className="text-muted transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                </summary>
                <div className="p-2">
                  <WindowEditor
                    value={draft.window}
                    today={data.today}
                    horizon={data.scannedUntil}
                    save={saveState}
                    onChange={(window) => setDraft((r) => ({ ...r, window }))}
                  />
                </div>
              </details>
            )}

            {updated && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted tabular">
                <span className="size-1.5 rounded-full bg-clear animate-pulse-dot" aria-hidden="true" />
                Live, updated {updated}
              </p>
            )}

            <StepButtons onBack={() => setStep(1)} onNext={goDetails} nextDisabled={!selectedSlot} />
          </>
        )}

        {ready && !showStatus && step === 3 && draft && (
          <div id="details">
            <ApplicantsEditor
              key={system}
              system={system}
              persons={draft.persons}
              email={draft.email}
              showAll={showDetailErrors}
              onChange={({ persons, email }) => setDraft((r) => ({ ...r, persons, email }))}
            />
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={showDetailErrors && !consent}
                className="mt-0.5 size-5 flex-none accent-[#006aa7]"
              />
              <span>{t("gdpr")}</span>
            </label>
            {showDetailErrors && !consent && (
              <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">
                {t("tickBox")}
              </p>
            )}
            <StepButtons onBack={() => setStep(2)} onNext={goConfirm} />
          </div>
        )}

        {ready && !showStatus && step === 4 && draft && selectedSlot && (
          <>
            <h1 className="text-2xl font-semibold text-ink">{t("reviewBooking")}</h1>
            <dl className="mt-4 divide-y divide-line-2 text-sm">
              <Row label={t("rowService")} value={t(system === "passport" ? "svcPassport" : "svcMigrationShort")} />
              <Row label={t("dateLabel")} value={dayLong(dayOf(selectedSlot.slot))} />
              <Row label={t("timeLabel")} value={clockOf(selectedSlot.slot)} />
              <Row
                label={t("rowName")}
                value={draft.persons.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(", ")}
              />
              <Row label={t("rowEmail")} value={draft.email} />
              <Row label={t("rowApplicants")} value={String(draft.persons.length)} />
            </dl>
            <p className="mt-4 text-[0.8125rem] text-muted">
              {selectedSlot.queued === 0 ? t("nobodyElse") : t("alreadyQueued", { n: selectedSlot.queued })}{" "}
              {t("confirmingAdds")}
            </p>
            <StepButtons
              onBack={() => setStep(3)}
              onNext={() => void book(selectedSlot)}
              nextLabel={t("confirmBooking")}
              nextBusy={working}
              nextDisabled={working}
            />
          </>
        )}
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <p
            key={toast.id}
            className={`animate-rise pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ${
              toast.tone === "warn" ? "bg-hot text-on-hot" : "bg-ink text-paper"
            }`}
          >
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-ink">{value}</dd>
    </div>
  );
}

function StepButtons({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  nextBusy,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextBusy?: boolean;
}) {
  const { t } = useI18n();
  const label = nextLabel ?? t("next");
  return (
    <div className="mt-6 flex gap-3">
      <button type="button" className="btn btn-ghost flex-none border-accent-line px-6 text-accent-line" onClick={onBack}>
        {t("back")}
      </button>
      <button type="button" className="btn btn-primary group flex-1" disabled={nextDisabled} onClick={onNext}>
        {nextBusy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {nextBusy ? t("queuing") : label}
        {!nextBusy && nextLabel === undefined && (
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/** What the person sees once they hold a place: in the queue, or booked. */
function StatusCard({
  system,
  slot,
  people,
  email,
  working,
  confirming,
  onAskCancel,
  onKeep,
  onCancel,
  onAnother,
}: {
  system: SystemId;
  slot: ViewSlot;
  people: number;
  email: string;
  working: boolean;
  confirming: boolean;
  onAskCancel: () => void;
  onKeep: () => void;
  onCancel: () => void;
  onAnother: () => void;
}) {
  const { t, lang } = useI18n();
  const booked = slot.mine?.status === "booked";
  const ahead = Math.max(slot.queued - 1, 0);
  return (
    <div className="text-center">
      <span
        className={`mx-auto grid size-14 place-items-center rounded-full ${booked ? "bg-[#fecc02] text-[#0b2a3c]" : "border-2 border-accent text-accent-line"}`}
        aria-hidden="true"
      >
        {booked ? <Check className="size-7" strokeWidth={3} /> : <Loader2 className="size-6 animate-spin" />}
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-ink">
        {t(booked ? "bookedTitle" : "queueTitle")}
      </h1>
      {booked ? (
        <>
          <p className="mt-2 text-sm text-muted">{t("bookingNumber")}</p>
          <p className="mx-auto mt-2 w-fit rounded-lg bg-surface-2 px-5 py-2.5 font-mono text-lg font-semibold tracking-wider text-ink">
            {slot.mine?.reference ?? t("refPending")}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted" aria-live="polite">
          {ahead === 0 ? t("nobodyAhead") : ahead === 1 ? t("oneAhead") : t("manyAhead", { n: ahead })} {t("keepOpen")}
        </p>
      )}

      <dl className="mt-5 divide-y divide-line-2 text-left text-sm">
        <Row label={t("rowService")} value={t(system === "passport" ? "svcPassport" : "svcMigrationShort")} />
        <Row label={t("dateLabel")} value={formatDayLong(dayOf(slot.slot), LOCALES[lang])} />
        <Row label={t("timeLabel")} value={clockOf(slot.slot)} />
        <Row label={t("rowApplicants")} value={String(people)} />
        <Row label={t("rowEmail")} value={email} />
      </dl>

      {confirming ? (
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-ghost flex-1 border-accent-line text-accent-line" onClick={onKeep}>
            {t("keepIt")}
          </button>
          <button type="button" className="btn btn-danger-solid flex-1" disabled={working} onClick={onCancel}>
            {working && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {t("yesCancel")}
          </button>
        </div>
      ) : (
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-ghost flex-1 border-accent-line text-accent-line" onClick={onAnother}>
            {t("bookAnother")}
          </button>
          <button type="button" className="btn btn-danger flex-1" onClick={onAskCancel}>
            {t(booked ? "cancelBooking" : "leaveQueue")}
          </button>
        </div>
      )}
    </div>
  );
}

export function ConsoleFallback() {
  usePasstidTheme();
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-16" aria-busy="true">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <SlotListSkeleton />
      </div>
    </div>
  );
}
