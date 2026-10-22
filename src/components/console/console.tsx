"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronRight, RefreshCw, ScanLine, SlidersHorizontal } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import {
  SYSTEM_INFO,
  SYSTEMS,
  isSystemId,
  type BookingWindow,
  type SlotsResponse,
  type SystemId,
} from "@/lib/types";
import { EMBASSY_TZ, clockOf, dayOf, embassyClock, formatDayLong, formatDayShort } from "@/lib/time";
import { describeWindow, matchesWindow, parseClock, sameWindow, validateWindow, windowRanges } from "@/lib/window";
import { ActionBar } from "./action-bar";
import { ChatPanel, type ChatMessage } from "./chat-panel";
import { SlotList, SlotListSkeleton, type ViewSlot } from "./slot-list";
import { WindowEditor } from "./window-editor";
import { WindowSummary, type SaveState } from "./window-summary";

type Filter = "window" | "free" | "all";
type Sort = "soonest" | "quietest";

const POLL_SLOTS_MS = 15_000;
const POLL_BOOKING_MS = 1_500;

const COMMANDS = [
  { cmd: "/status", hint: "List the slots inside your window with their queue counts" },
  { cmd: "/quietest", hint: "The least busy slots inside your window" },
  { cmd: "/window", hint: "Repeat the window the bot is using" },
  { cmd: "/book", hint: "Book the selected slot, or the earliest one in your window" },
];

const slotLabel = (iso: string) => `${formatDayShort(iso)} ${clockOf(iso)}`;

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
  const system: SystemId = isSystemId(requested) ? requested : "passport";
  const info = SYSTEM_INFO[system];

  const [draft, setDraft] = useState<BookingWindow | null>(null);
  const [saved, setSaved] = useState<BookingWindow | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [slotsBy, setSlotsBy] = useState<Partial<Record<SystemId, SlotsResponse>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ system: SystemId; slot: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("window");
  const [sort, setSort] = useState<Sort>("soonest");
  const [working, setWorking] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string; tone: "ok" | "warn" } | null>(null);

  const msgId = useRef(0);
  const announced = useRef(new Set<string>());
  const greeted = useRef(false);

  /* ----------------------------- helpers ----------------------------- */

  const say = useCallback((from: ChatMessage["from"], text: string) => {
    msgId.current += 1;
    const id = msgId.current;
    setChat((c) => [...c.slice(-60), { id, from, text, at: embassyClock() }]);
  }, []);

  /** Bot replies arrive after a short typing indicator, like the real chat. */
  const reply = useCallback(
    (text: string) => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        say("bot", text);
      }, 550);
    },
    [say],
  );

  const notify = useCallback((text: string, tone: "ok" | "warn" = "ok") => {
    setToast({ id: Date.now(), text, tone });
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
          if (signal?.aborted) return null;
          setLoadError(err instanceof ApiRequestError ? err.message : "Couldn't load slots.");
          return null;
        },
      ),
    [],
  );

  /* ----------------------------- effects ----------------------------- */

  // The window lives on the backend so the bot and this page always agree.
  useEffect(() => {
    let alive = true;
    api
      .getWindow()
      .then((r) => {
        if (!alive) return;
        setDraft(r.window);
        setSaved(r.window);
      })
      .catch(() => {
        if (alive) setLoadError("Couldn't load your booking window.");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Slots for the active system, refreshed while the tab is visible.
  useEffect(() => {
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
  }, [system, loadSlots]);

  // Autosave the window once it is valid and has changed.
  const draftIssues = draft ? validateWindow(draft) : [];
  const draftValid = draftIssues.length === 0;
  useEffect(() => {
    if (!draft || !saved || sameWindow(draft, saved) || validateWindow(draft).length) return;
    const t = setTimeout(() => {
      setSaveState("saving");
      api
        .saveWindow(draft)
        .then((r) => {
          setSaved(r.window);
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 600);
    return () => clearTimeout(t);
  }, [draft, saved]);

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
              reply(
                `Booked: ${formatDayLong(b.slot)} at ${clockOf(b.slot)}.\nBooking number ${b.reference}. ` +
                  `The slot now shows ${depth} queued. Yours stays counted because the slot is taken.`,
              );
              notify(`Booked ${slotLabel(b.slot)} · ref ${b.reference}`);
            } else if (b.reason !== "cancelled") {
              const why = b.reason === "timed_out" ? "it made no progress for 15 minutes" : "the slot was gone by the time it was clicked";
              reply(
                `That booking failed: ${why}. Your queue entry was released, so ${slotLabel(b.slot)} is back to ${depth} queued. ` +
                  `Nothing is stuck; pick another slot or let me take the next one.`,
              );
              notify(`Booking failed. Slot released, back to ${depth} queued`, "warn");
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
  }, [pendingKey, loadSlots, reply, notify]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ----------------------------- derived ----------------------------- */

  // The bot keeps using the last valid window while the draft is broken.
  const effective = draft && draftValid ? draft : saved;
  const data = slotsBy[system];

  const view = useMemo<ViewSlot[]>(() => {
    if (!data || !effective) return [];
    return data.slots.map((s) => ({ ...s, inWindow: matchesWindow(s.slot, effective) }));
  }, [data, effective]);

  const inWin = useMemo(() => view.filter((s) => s.inWindow), [view]);
  const outWin = useMemo(() => view.filter((s) => !s.inWindow), [view]);

  const cmp = useCallback(
    (a: ViewSlot, b: ViewSlot) =>
      sort === "quietest" ? a.queued - b.queued || a.slot.localeCompare(b.slot) : a.slot.localeCompare(b.slot),
    [sort],
  );

  const shown = useMemo(() => {
    const base =
      filter === "window" ? inWin : filter === "free" ? inWin.filter((s) => s.queued === 0 && !s.mine) : view;
    return [...base].sort(cmp);
  }, [filter, inWin, view, cmp]);

  const outsideSorted = useMemo(() => [...outWin].sort((a, b) => a.slot.localeCompare(b.slot)), [outWin]);

  const selectedSlot = selection?.system === system ? (view.find((s) => s.slot === selection.slot) ?? null) : null;
  const otherActive = view.find((s) => s.mine && s.slot !== selectedSlot?.slot) ?? null;
  const uncontested = inWin.filter((s) => s.queued === 0).length;

  // Greet once, with the same status message the chat bot sends.
  useEffect(() => {
    if (greeted.current || !data || !effective) return;
    greeted.current = true;
    const t = setTimeout(() => {
      say("me", "/status");
      reply(statusMessage(system, view, effective));
    }, 300);
    return () => clearTimeout(t);
  }, [data, effective, system, view, say, reply]);

  /* ----------------------------- actions ----------------------------- */

  const switchSystem = (next: SystemId) => {
    if (next === system) return;
    const q = new URLSearchParams(params.toString());
    if (next === "passport") q.delete("system");
    else q.set("system", next);
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const select = (slot: string) =>
    setSelection((cur) => (cur?.system === system && cur.slot === slot ? null : { system, slot }));

  const book = async (slot: ViewSlot) => {
    setWorking(true);
    say("me", `/book ${slot.slot}`);
    try {
      const b = await api.book(system, slot.slot);
      const fresh = await loadSlots(system);
      const depth = fresh?.slots.find((s) => s.slot === b.slot)?.queued ?? slot.queued + 1;
      setSelection({ system, slot: b.slot });
      reply(
        `Queued: ${formatDayLong(b.slot)} at ${clockOf(b.slot)}.\nYou are #${depth} in the queue for this slot. ` +
          `The count went up the moment you confirmed, not when the booking succeeds.`,
      );
      notify(`Queued: ${slotLabel(b.slot)} now shows ${depth} queued`);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "The booking could not be started.";
      reply(`I couldn't queue that: ${message}`);
      notify(message, "warn");
      if (err instanceof ApiRequestError && err.status === 404) void loadSlots(system);
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
      say("me", `/cancel ${b.slot}`);
      reply(`Cancelled. ${slotLabel(b.slot)} is back to ${depth} queued. No phantom entry left behind.`);
      notify(`Cancelled: ${slotLabel(b.slot)} back to ${depth} queued`);
    } catch (err) {
      announced.current.delete(bookingId);
      notify(err instanceof ApiRequestError ? err.message : "Couldn't cancel. Try again.", "warn");
    } finally {
      setWorking(false);
    }
  };

  /** Widen the window just enough to cover one outside slot. */
  const include = (slot: ViewSlot) => {
    if (!draft) return;
    const day = dayOf(slot.slot);
    const next: BookingWindow = { ...draft, emergency: false };
    if (!next.from || day < next.from) next.from = day;
    if (next.to && day > next.to) next.to = day;
    const mins = parseClock(clockOf(slot.slot), "start") ?? 0;
    const ranges = windowRanges(next.times);
    if (ranges.length && !ranges.some((r) => mins >= r.start && mins < r.end)) {
      const h = Math.floor(mins / 60);
      next.times = [...next.times, { start: `${String(h).padStart(2, "0")}:00`, end: h >= 23 ? "EOD" : `${String(h + 1).padStart(2, "0")}:00` }];
    }
    setDraft(next);
    notify(`Window widened to include ${slotLabel(slot.slot)}`);
  };

  const runCommand = (cmd: string) => {
    if (!effective) return;
    if (cmd === "/book") {
      const target =
        selectedSlot && selectedSlot.inWindow && !selectedSlot.mine
          ? selectedSlot
          : [...inWin].sort((a, b) => a.slot.localeCompare(b.slot)).find((s) => !s.mine);
      if (otherActive || selectedSlot?.mine) {
        say("me", "/book");
        reply("You already have a booking running or confirmed on this system. Cancel it first, since only one is allowed per system.");
        return;
      }
      if (!target) {
        say("me", "/book");
        reply(`There is no free slot inside your window (${describeWindow(effective)}). Nothing was booked.`);
        return;
      }
      void book(target);
      return;
    }
    say("me", cmd);
    if (cmd === "/status") reply(statusMessage(system, view, effective));
    else if (cmd === "/window")
      reply(`Booking only ${describeWindow(effective)}.\nTimes are the embassy's local time (London). The start of a range is bookable, the end is not.`);
    else if (cmd === "/quietest") {
      const q = [...inWin].sort((a, b) => a.queued - b.queued || a.slot.localeCompare(b.slot)).slice(0, 3);
      reply(
        q.length
          ? `Quietest inside your window:\n${q.map((s) => `• ${slotLabel(s.slot)} · ${s.queued} queued`).join("\n")}`
          : "Nothing inside your window right now.",
      );
    }
  };

  /* ----------------------------- render ----------------------------- */

  const ready = !!data && !!draft && !!effective;
  const updated = data ? clockFmt.format(new Date(data.generatedAt)) : null;

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
            {effective ? (
              effective.emergency ? (
                <span className="font-medium text-hot">Emergency mode: the first slot that appears gets booked.</span>
              ) : (
                <>
                  Booking only <span className="font-medium text-ink">{describeWindow(effective)}</span>
                </>
              )
            ) : (
              <span className="skeleton inline-block h-4 w-72 align-middle" aria-hidden="true" />
            )}
          </p>
        </div>

        <div className="inline-flex self-start rounded-xl border border-line bg-sunken p-1 lg:self-auto" role="group" aria-label="Booking system">
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

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-cols-[21rem_minmax(0,1fr)_23rem]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20" aria-label="Booking window">
          {draft && data ? (
            <>
              {/* On phones the editor collapses so the slots are the first thing you see. */}
              <button
                type="button"
                aria-expanded={editorOpen}
                aria-controls="window-panel"
                onClick={() => setEditorOpen((o) => !o)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-sm lg:hidden"
              >
                <SlidersHorizontal className="size-4 flex-none text-accent" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    {editorOpen ? "Hide booking window" : "Edit booking window"}
                  </span>
                  {!editorOpen && effective && (
                    <span className="block truncate font-mono text-xs text-muted">{describeWindow(effective)}</span>
                  )}
                </span>
                <ChevronDown
                  className={`size-4 flex-none text-muted transition-transform ${editorOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <div id="window-panel" className={`${editorOpen ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>
                <WindowEditor value={draft} today={data.today} horizon={data.scannedUntil} onChange={setDraft} />
                <WindowSummary value={draft} save={draftValid ? saveState : "invalid"} />
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

        {/* Results */}
        <section aria-labelledby="results-h" className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
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
              className="btn btn-ghost h-11 min-h-11 sm:h-9 sm:min-h-9 px-3 text-sm"
              aria-label="Refresh slots now"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line-2 pb-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter slots">
              {(
                [
                  ["window", "Inside my window", inWin.length],
                  ["free", "Nobody queued", inWin.filter((s) => s.queued === 0 && !s.mine).length],
                  ["all", "All open slots", view.length],
                ] as const
              ).map(([id, label, n]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full sm:min-h-9 border px-3.5 text-[0.8125rem] font-medium transition-colors ${
                    filter === id
                      ? "border-accent-line bg-accent-soft text-accent-ink"
                      : "border-line bg-surface text-ink-2 hover:border-line-strong"
                  }`}
                >
                  {label}
                  <span className="font-mono text-[0.6875rem] opacity-70 tabular">{ready ? n : "–"}</span>
                </button>
              ))}
            </div>
            <label className="ml-auto flex items-center gap-2 text-[0.8125rem] text-muted">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="field min-h-11 w-auto py-1 pr-8 text-[0.8125rem] sm:min-h-9"
              >
                <option value="soonest">Soonest first</option>
                <option value="quietest">Least busy first</option>
              </select>
            </label>
          </div>

          {loadError && !data && (
            <div role="alert" className="mt-5 rounded-xl border border-hot-line bg-hot-bg p-4">
              <p className="flex items-center gap-2 font-semibold text-hot">
                <AlertTriangle className="size-4" aria-hidden="true" /> Can&rsquo;t reach the booking service
              </p>
              <p className="mt-1 text-sm text-ink-2">{loadError}</p>
              <button type="button" className="btn btn-ghost mt-3 h-11 min-h-11 sm:h-9 sm:min-h-9 text-sm" onClick={() => void loadSlots(system)}>
                Try again
              </button>
            </div>
          )}
          {loadError && data && (
            <p className="mt-3 text-[0.8125rem] text-hot" role="status">
              Couldn&rsquo;t refresh. Showing the slots from {updated}.
            </p>
          )}

          <div className="min-h-[24rem]">
            {!ready && !loadError && <SlotListSkeleton />}

            {ready && effective && (
              <>
                {!effective.emergency && inWin.length === 0 && (
                  <div className="mt-5 rounded-xl border border-hot-line bg-hot-bg p-4">
                    <p className="font-semibold text-hot">No free slot inside your window</p>
                    <p className="mt-1 text-sm text-ink-2">
                      Nothing will be booked. Widen the dates, add a time range, or switch on emergency mode to take
                      whatever appears first.
                      {outWin.length > 0 && " The nearest slots outside your window are listed below."}
                    </p>
                  </div>
                )}

                {shown.length > 0 ? (
                  <SlotList
                    slots={shown}
                    today={data.today}
                    grouped={sort === "soonest"}
                    selected={selectedSlot?.slot ?? null}
                    onSelect={select}
                  />
                ) : (
                  inWin.length > 0 && (
                    <div className="mt-5 rounded-xl border border-dashed border-line-strong p-5 text-center">
                      <p className="font-medium text-ink">Every slot in your window already has someone queued.</p>
                      <p className="mt-1 text-sm text-muted">
                        A busy slot never blocks a booking. The count is information, not a lock.
                      </p>
                      <button type="button" className="btn btn-ghost mt-3 h-11 min-h-11 sm:h-9 sm:min-h-9 text-sm" onClick={() => setFilter("window")}>
                        Show all {inWin.length} in my window
                      </button>
                    </div>
                  )
                )}

                {filter !== "all" && outsideSorted.length > 0 && (
                  <details className="group mt-5 border-t border-line-2 pt-3" open={inWin.length === 0 || undefined}>
                    <summary className="flex min-h-11 list-none items-center gap-1.5 rounded-md text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                      <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
                      {outsideSorted.length} open slot{outsideSorted.length > 1 ? "s" : ""} outside your window
                      <span className="text-xs">(listed, never booked)</span>
                    </summary>
                    <div className="mt-1">
                      <SlotList
                        slots={outsideSorted.slice(0, 8)}
                        today={data.today}
                        grouped={false}
                        selected={selectedSlot?.slot ?? null}
                        onSelect={select}
                        dimmed
                      />
                    </div>
                  </details>
                )}

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
            emergency={!!effective?.emergency}
            windowValid={draftValid}
            working={working}
            onBook={() => selectedSlot && void book(selectedSlot)}
            onCancel={(id) => void cancel(id)}
            onInclude={() => selectedSlot && include(selectedSlot)}
            onJump={(slot) => setSelection({ system, slot })}
          />
        </section>

        {/* Chat */}
        <div className="lg:col-span-2 2xl:sticky 2xl:top-20 2xl:col-span-1">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-1">
            <ChatPanel messages={chat} typing={typing} commands={COMMANDS} onCommand={runCommand} />
            <CountRules />
          </div>
        </div>
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

function statusMessage(system: SystemId, view: ViewSlot[], w: BookingWindow): string {
  const head = `${SYSTEM_INFO[system].name}: booking only ${describeWindow(w)}`;
  const inside = view.filter((s) => s.inWindow).slice(0, 5);
  if (!inside.length) {
    const near = view.slice(0, 3);
    return (
      `${head}\n\nNo free slot inside your window, so nothing will be booked.` +
      (near.length ? `\nNearest outside it:\n${near.map((s) => `• ${slotLabel(s.slot)}`).join("\n")}` : "")
    );
  }
  return (
    `${head}\n\n${inside.map((s) => `• ${slotLabel(s.slot)} · ${s.queued} queued`).join("\n")}\n\n` +
    `Send /book to take the one you picked, or I'll take the earliest.`
  );
}

function CountRules() {
  const rows = [
    ["Nobody has claimed the slot", "0 queued, uncontested"],
    ["Someone confirms a booking", "Count rises immediately, before it succeeds"],
    ["That booking fails or is cancelled", "Count drops back, no phantom entry"],
    ["A booking hangs for 15 minutes", "Entry stops counting; slot released"],
    ["Someone else views the slot", "They see a number only, never who"],
  ];
  return (
    <section aria-labelledby="count-h" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 id="count-h" className="label-mono">When the count changes</h2>
      <dl className="mt-3 divide-y divide-line-2">
        {rows.map(([event, effect]) => (
          <div key={event} className="py-2.5">
            <dt className="text-[0.8125rem] text-muted">{event}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{effect}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 rounded-lg border-l-2 border-accent bg-accent-soft px-3 py-2.5 text-[0.8125rem] text-ink-2">
        <strong className="text-ink">Information, not a lock.</strong> A busy slot never blocks your booking. It just
        helps you pick a quieter one.
      </p>
    </section>
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
