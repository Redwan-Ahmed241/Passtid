"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronRight, RefreshCw, ScanLine, SlidersHorizontal } from "lucide-react";
import { api, ApiRequestError, makeId } from "@/lib/api";
import { isComplete } from "@/lib/applicants";
import {
  SYSTEM_INFO,
  SYSTEMS,
  isSystemId,
  type BookingRequest,
  type BookingWindow,
  type SlotsResponse,
  type SystemId,
} from "@/lib/types";
import { EMBASSY_TZ, clockOf, dayOf, formatDayLong, formatDayShort, monthOf } from "@/lib/time";
import { describeWindow, MAX_DATE_RANGES, matchesWindow, parseClock, validateWindow } from "@/lib/window";
import { announceAuthChange, useMe } from "../auth/use-me";
import { ActionBar } from "./action-bar";
import { ApplicantsEditor } from "./applicants-editor";
import { MonthCalendar, type DayInfo } from "./month-calendar";
import type { SaveState } from "./save-badge";
import { SlotList, SlotListSkeleton, type ViewSlot } from "./slot-list";
import { WindowEditor } from "./window-editor";

const POLL_SLOTS_MS = 15_000;
const POLL_BOOKING_MS = 1_500;

const slotLabel = (iso: string) => `${formatDayShort(iso)} ${clockOf(iso)}`;
const sameRequest = (a: BookingRequest, b: BookingRequest) => JSON.stringify(a) === JSON.stringify(b);

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
  const info = SYSTEM_INFO[system];
  const { loading: authLoading, user } = useMe();

  const [drafts, setDrafts] = useState<Partial<Record<SystemId, BookingRequest>>>({});
  const [saved, setSaved] = useState<Partial<Record<SystemId, BookingRequest>>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [slotsBy, setSlotsBy] = useState<Partial<Record<SystemId, SlotsResponse>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ system: SystemId; slot: string } | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showDetailErrors, setShowDetailErrors] = useState(false);
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
          setLoadError(err instanceof ApiRequestError ? err.message : "Couldn't load slots.");
          return null;
        },
      ),
    [handleAuthLoss],
  );

  /* ----------------------------- effects ----------------------------- */

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
        if (!handleAuthLoss(err)) setLoadError("Couldn't load your booking request.");
      },
    );
  }, [system, user, handleAuthLoss]);

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
  const windowIssues = draft ? validateWindow(draft.window) : [];
  const windowValid = windowIssues.length === 0;
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
              notify(`Booked ${slotLabel(b.slot)}. Booking number ${b.reference}.`);
            } else if (b.reason !== "cancelled") {
              const why = b.reason === "timed_out" ? "it made no progress for 15 minutes" : "the slot was gone by the time it was clicked";
              notify(`Booking failed: ${why}. ${slotLabel(b.slot)} is released and back to ${depth} queued.`, "warn");
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

  /* ----------------------------- derived ----------------------------- */

  // The bot keeps using the last valid window while the draft window is broken.
  const effectiveWindow: BookingWindow | null = draft ? (windowValid ? draft.window : (savedReq?.window ?? null)) : null;
  const data = slotsBy[system];

  const view = useMemo<ViewSlot[]>(() => {
    if (!data || !effectiveWindow) return [];
    return data.slots.map((s) => ({ ...s, inWindow: matchesWindow(s.slot, effectiveWindow) }));
  }, [data, effectiveWindow]);

  const inWin = useMemo(() => view.filter((s) => s.inWindow), [view]);

  const daysMap = useMemo(() => {
    const m = new Map<string, DayInfo>();
    for (const s of view) {
      const d = dayOf(s.slot);
      const cur = m.get(d) ?? { total: 0, inWindow: 0, mine: false };
      cur.total += 1;
      if (s.inWindow) cur.inWindow += 1;
      if (s.mine) cur.mine = true;
      m.set(d, cur);
    }
    return m;
  }, [view]);

  const sortedDays = useMemo(() => [...daysMap.keys()].sort(), [daysMap]);
  const defaultDay = sortedDays.find((d) => (daysMap.get(d)?.inWindow ?? 0) > 0) ?? sortedDays[0] ?? null;
  const selectedDay = pickedDay && daysMap.has(pickedDay) ? pickedDay : defaultDay;
  const month = pickedMonth ?? monthOf(selectedDay ?? data?.today ?? "0000-00");

  const daySlots = useMemo(
    () => (selectedDay ? view.filter((s) => dayOf(s.slot) === selectedDay).sort((a, b) => a.slot.localeCompare(b.slot)) : []),
    [view, selectedDay],
  );

  const selectedSlot = selection?.system === system ? (daySlots.find((s) => s.slot === selection.slot) ?? null) : null;
  const otherActive = view.find((s) => s.mine && s.slot !== selectedSlot?.slot) ?? null;
  const nextInWindow = inWin.find((s) => !s.mine) ?? null;
  const uncontested = inWin.filter((s) => s.queued === 0).length;

  /* ----------------------------- actions ----------------------------- */

  const switchSystem = (next: SystemId) => {
    if (next === system) return;
    const q = new URLSearchParams(params.toString());
    if (next === "passport") q.delete("system");
    else q.set("system", next);
    const qs = q.toString();
    setPickedDay(null);
    setPickedMonth(null);
    setSelection(null);
    setShowDetailErrors(false);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setDraft = (update: (r: BookingRequest) => BookingRequest) =>
    setDrafts((d) => (d[system] ? { ...d, [system]: update(d[system] as BookingRequest) } : d));

  const pickDay = (day: string) => {
    setPickedDay(day);
    setPickedMonth(null);
    setSelection(null);
  };

  const changeMonth = (m: string) => {
    setPickedMonth(m);
    const first = sortedDays.filter((d) => monthOf(d) === m);
    const preferred = first.find((d) => (daysMap.get(d)?.inWindow ?? 0) > 0) ?? first[0] ?? null;
    setPickedDay(preferred);
    setSelection(null);
  };

  const jumpTo = (slot: string) => {
    setPickedDay(dayOf(slot));
    setPickedMonth(null);
    setSelection({ system, slot });
  };

  const selectSlot = (slot: string) =>
    setSelection((cur) => (cur?.system === system && cur.slot === slot ? null : { system, slot }));

  /** Open the form, show every missing field and move focus to the first one. */
  const fixDetails = useCallback(() => {
    setShowDetailErrors(true);
    setEditorOpen(true);
    setTimeout(() => {
      const section = document.getElementById("people-section");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.querySelector<HTMLElement>("input[aria-invalid='true'], input")?.focus({ preventScroll: true });
    }, 80);
  }, []);

  const book = async (slot: ViewSlot) => {
    if (!draft) return;
    if (!detailsReady) {
      fixDetails();
      return;
    }
    setWorking(true);
    try {
      // Make sure the backend has the latest people and email before it books.
      if (!savedReq || !sameRequest(draft, savedReq)) {
        await api.saveRequest(system, draft);
        setSaved((s) => ({ ...s, [system]: draft }));
      }
      const b = await api.book(system, slot.slot);
      const fresh = await loadSlots(system);
      const depth = fresh?.slots.find((s) => s.slot === b.slot)?.queued ?? slot.queued + 1;
      setSelection({ system, slot: b.slot });
      const n = draft.persons.length;
      notify(`Queued ${slotLabel(b.slot)} for ${n} ${n === 1 ? "person" : "people"}. You are #${depth} in the queue.`);
    } catch (err) {
      if (handleAuthLoss(err)) return;
      const message = err instanceof ApiRequestError ? err.message : "The booking could not be started.";
      notify(message, "warn");
      if (err instanceof ApiRequestError && err.status === 404) void loadSlots(system);
      if (err instanceof ApiRequestError && err.code === "incomplete_details") fixDetails();
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
      notify(`Cancelled. ${slotLabel(b.slot)} is back to ${depth} queued.`);
    } catch (err) {
      announced.current.delete(bookingId);
      if (!handleAuthLoss(err)) notify(err instanceof ApiRequestError ? err.message : "Couldn't cancel. Try again.", "warn");
    } finally {
      setWorking(false);
    }
  };

  /** Add a single-day range that covers one outside slot. */
  const include = (slot: ViewSlot) => {
    if (!draft) return;
    if (draft.window.ranges.length >= MAX_DATE_RANGES) {
      notify(`Remove a date range first. You can have up to ${MAX_DATE_RANGES}.`, "warn");
      setEditorOpen(true);
      return;
    }
    const day = dayOf(slot.slot);
    const h = Math.floor((parseClock(clockOf(slot.slot), "start") ?? 0) / 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    setDraft((r) => ({
      ...r,
      window: {
        emergency: false,
        ranges: [
          ...r.window.ranges,
          { id: makeId(), from: day, to: day, times: [{ start: `${pad(h)}:00`, end: h >= 23 ? "EOD" : `${pad(h + 1)}:00` }] },
        ],
      },
    }));
    notify(`Window widened to include ${slotLabel(slot.slot)}`);
  };

  /* ----------------------------- render ----------------------------- */

  if (authLoading || !user) return <ConsoleFallback />;

  const ready = !!data && !!draft && !!effectiveWindow;
  const updated = data ? clockFmt.format(new Date(data.generatedAt)) : null;
  const sidebarSummary = effectiveWindow ? describeWindow(effectiveWindow) : "";

  return (
    <div className="mx-auto max-w-[96rem] px-4 pt-8 pb-16 sm:px-6 lg:px-8">
      {/* Page head */}
      <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="label-mono">Booking console</p>
          <h1 className="mt-2 font-display text-[2.25rem] leading-[1.05] font-medium tracking-[-0.015em] text-ink sm:text-[2.75rem]">
            Slots you can attend, <em className="text-accent">and how busy they are.</em>
          </h1>
          <p className="mt-3 min-h-6 text-[0.9375rem] text-ink-2">
            {effectiveWindow ? (
              effectiveWindow.emergency ? (
                <span className="font-medium text-hot">Emergency mode: the first slot that appears gets booked.</span>
              ) : (
                <>
                  Booking only <span className="font-medium text-ink">{sidebarSummary}</span>
                </>
              )
            ) : (
              <span className="skeleton inline-block h-4 w-72 align-middle" aria-hidden="true" />
            )}
          </p>
        </div>

        <div className="inline-flex self-start rounded-xl border border-line bg-sunken p-1 lg:self-auto" role="group" aria-label="Service">
          {SYSTEMS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={system === id}
              onClick={() => switchSystem(id)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                system === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {SYSTEM_INFO[id].short}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Sidebar: window and people */}
        <aside className="flex flex-col gap-4" aria-label="Booking request">
          {draft && data ? (
            <>
              {/* On phones the form collapses so the calendar is the first thing you see. */}
              <button
                type="button"
                aria-expanded={editorOpen}
                aria-controls="request-panel"
                onClick={() => setEditorOpen((o) => !o)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-sm lg:hidden"
              >
                <SlidersHorizontal className="size-4 flex-none text-accent" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {editorOpen ? "Hide booking request" : "Edit booking request"}
                    {!detailsReady && (
                      <span className="rounded-md border border-busy-line bg-busy-bg px-1.5 py-0.5 text-[0.6875rem] font-medium text-busy">
                        Details needed
                      </span>
                    )}
                  </span>
                  {!editorOpen && (
                    <span className="block truncate font-mono text-xs text-muted">{sidebarSummary}</span>
                  )}
                </span>
                <ChevronDown
                  className={`size-4 flex-none text-muted transition-transform ${editorOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <div id="request-panel" className={`${editorOpen ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
                <WindowEditor
                  value={draft.window}
                  today={data.today}
                  horizon={data.scannedUntil}
                  save={saveState}
                  onChange={(window) => setDraft((r) => ({ ...r, window }))}
                />
                <div id="people-section" className="scroll-mt-24">
                  <ApplicantsEditor
                    key={system}
                    system={system}
                    persons={draft.persons}
                    email={draft.email}
                    showAll={showDetailErrors}
                    onChange={({ persons, email }) => setDraft((r) => ({ ...r, persons, email }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="h-14 rounded-2xl border border-line bg-surface p-5 lg:h-[34rem]" aria-hidden="true">
              <div className="skeleton h-3 w-32" />
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="skeleton h-11" />
                <div className="skeleton h-11" />
              </div>
              <div className="mt-6 skeleton h-11" />
              <div className="mt-2 skeleton h-11" />
            </div>
          )}
        </aside>

        {/* Calendar and the day's slots */}
        <section aria-labelledby="results-h" className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="results-h" className="text-base font-semibold text-ink">
                {info.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted tabular" aria-live="polite">
                {ready ? (
                  <>
                    {inWin.length} in window · {uncontested} uncontested
                    {updated && (
                      <>
                        {" · "}
                        <span className="inline-flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-clear animate-pulse-dot" aria-hidden="true" />
                          live, {updated}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  "Loading slots…"
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadSlots(system)}
              className="btn btn-ghost h-11 min-h-11 px-3 text-sm sm:h-9 sm:min-h-9"
              aria-label="Refresh slots now"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
            </button>
          </div>

          {loadError && !data && (
            <div role="alert" className="mt-5 rounded-xl border border-hot-line bg-hot-bg p-4">
              <p className="flex items-center gap-2 font-semibold text-hot">
                <AlertTriangle className="size-4" aria-hidden="true" /> Can&rsquo;t reach the booking service
              </p>
              <p className="mt-1 text-sm text-ink-2">{loadError}</p>
              <button type="button" className="btn btn-ghost mt-3 h-11 min-h-11 text-sm sm:h-9 sm:min-h-9" onClick={() => void loadSlots(system)}>
                Try again
              </button>
            </div>
          )}
          {loadError && data && (
            <p className="mt-3 text-[0.8125rem] text-hot" role="status">
              Couldn&rsquo;t refresh. Showing the slots from {updated}.
            </p>
          )}

          <div className="mt-5 min-h-[24rem]">
            {!ready && !loadError && <SlotListSkeleton />}

            {ready && data && effectiveWindow && (
              <>
                {!effectiveWindow.emergency && inWin.length === 0 && (
                  <div className="mb-5 rounded-xl border border-hot-line bg-hot-bg p-4">
                    <p className="font-semibold text-hot">No free slot inside your window</p>
                    <p className="mt-1 text-sm text-ink-2">
                      Nothing will be booked. Widen the dates, add a time range, or switch on emergency mode to take
                      whatever appears first. Slots outside your window are still shown on the calendar.
                    </p>
                  </div>
                )}

                {/* Calendar beside the day's slots on wide screens, stacked below that. */}
                <div className="xl:grid xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-8">
                  <div>
                    <MonthCalendar
                      month={month}
                      today={data.today}
                      scannedUntil={data.scannedUntil}
                      days={daysMap}
                      selectedDay={selectedDay}
                      onSelectDay={pickDay}
                      onMonthChange={changeMonth}
                    />

                    {nextInWindow && dayOf(nextInWindow.slot) !== selectedDay && (
                      <button
                        type="button"
                        onClick={() => jumpTo(nextInWindow.slot)}
                        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-accent hover:text-accent-ink"
                      >
                        Next slot in your window: {slotLabel(nextInWindow.slot)}
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="mt-6 border-t border-line-2 pt-5 xl:mt-0 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
                    {selectedDay ? (
                      <>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h3 className="text-base font-semibold text-ink">{formatDayLong(selectedDay)}</h3>
                          <span className="font-mono text-xs text-muted tabular">
                            {daySlots.length} slot{daySlots.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mt-3">
                          <SlotList
                            slots={daySlots}
                            today={data.today}
                            grouped={false}
                            selected={selectedSlot?.slot ?? null}
                            onSelect={selectSlot}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-line-strong p-5 text-center">
                        <p className="font-medium text-ink">No open slots right now</p>
                        <p className="mt-1 text-sm text-muted">The site has nothing free in the next {data.scanWeeks} weeks. This page checks again every 15 seconds.</p>
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-6 flex items-center gap-2 font-mono text-xs text-muted">
                  <ScanLine className="size-3.5" aria-hidden="true" />
                  Scanned {data.scanWeeks} weeks ahead, up to {formatDayShort(data.scannedUntil)}. Nothing later is checked.
                </p>
              </>
            )}
          </div>

          <ActionBar
            slot={selectedSlot}
            otherActive={otherActive}
            emergency={!!effectiveWindow?.emergency}
            windowValid={windowValid}
            detailsReady={detailsReady}
            working={working}
            onBook={() => selectedSlot && void book(selectedSlot)}
            onCancel={(id) => void cancel(id)}
            onInclude={() => selectedSlot && include(selectedSlot)}
            onJump={jumpTo}
            onFixDetails={fixDetails}
          />
        </section>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <p
            key={toast.id}
            className={`animate-rise pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ${
              toast.tone === "warn" ? "bg-hot text-surface" : "bg-ink text-paper"
            }`}
          >
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}

export function ConsoleFallback() {
  return (
    <div className="mx-auto max-w-[96rem] px-4 pt-8 pb-16 sm:px-6 lg:px-8" aria-busy="true">
      <div className="border-b border-line pb-6">
        <p className="label-mono">Booking console</p>
        <div className="mt-3 skeleton h-10 w-full max-w-xl" />
        <div className="mt-3 skeleton h-4 w-72" />
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="h-14 rounded-2xl border border-line bg-surface lg:h-[34rem]" />
        <div className="rounded-2xl border border-line bg-surface p-5">
          <SlotListSkeleton />
        </div>
      </div>
    </div>
  );
}
