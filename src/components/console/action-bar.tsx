"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarPlus, Check, Loader2, MousePointerClick } from "lucide-react";
import { clockOf, formatDayShort } from "@/lib/time";
import type { ViewSlot } from "./slot-list";

interface Props {
  slot: ViewSlot | null;
  /** The caller's active booking on a different slot of this system, if any. */
  otherActive: ViewSlot | null;
  emergency: boolean;
  windowValid: boolean;
  working: boolean;
  onBook: () => void;
  onCancel: (bookingId: string) => void;
  onInclude: () => void;
  onJump: (slot: string) => void;
}

export function ActionBar({ slot, otherActive, emergency, windowValid, working, onBook, onCancel, onInclude, onJump }: Props) {
  const [confirming, setConfirming] = useState(false);
  const mine = slot?.mine ?? null;

  // Reset the two-step cancel whenever the selection or its status changes.
  const resetKey = `${slot?.slot ?? ""}|${mine?.status ?? ""}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setConfirming(false);
  }

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 6000);
    return () => clearTimeout(t);
  }, [confirming]);

  let title: React.ReactNode;
  let detail: React.ReactNode;
  let actions: React.ReactNode;

  if (!slot) {
    title = "No slot selected";
    detail = emergency
      ? "Emergency mode is on — the bot takes the first slot that appears."
      : "Pick a slot above, or let the bot take the earliest one in your window.";
    actions = (
      <span className="hidden items-center gap-1.5 text-sm text-muted sm:inline-flex">
        <MousePointerClick className="size-4" aria-hidden="true" /> Select a row
      </span>
    );
  } else {
    const when = `${formatDayShort(slot.slot)} · ${clockOf(slot.slot)}`;
    const others = slot.queued - (mine ? 1 : 0);

    if (mine?.status === "booked") {
      title = (
        <span className="inline-flex items-center gap-1.5 text-clear">
          <Check className="size-4" aria-hidden="true" /> Booked — {when}
        </span>
      );
      detail = "Confirmation and booking number sent. The slot stays counted as taken.";
      actions = confirming ? (
        <>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Keep it</button>
          <button type="button" className="btn btn-danger" disabled={working} onClick={() => onCancel(mine.bookingId)}>
            {working && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Yes, cancel appointment
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>Cancel appointment</button>
      );
    } else if (mine?.status === "pending") {
      title = (
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent animate-pulse-dot" aria-hidden="true" /> Booking in progress — {when}
        </span>
      );
      detail = `You are #${slot.queued} in the queue for this slot. ${
        others === 0 ? "Nobody else is ahead of you." : `${others} other${others > 1 ? "s" : ""} also queued.`
      }`;
      actions = (
        <button type="button" className="btn btn-ghost" disabled={working} onClick={() => onCancel(mine.bookingId)}>
          {working && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Cancel request
        </button>
      );
    } else if (!slot.inWindow) {
      title = when;
      detail = "Outside your window, so the bot will never book it. Widen the window to include it.";
      actions = (
        <button type="button" className="btn btn-ghost" onClick={onInclude}>
          <CalendarPlus className="size-4" aria-hidden="true" /> Include in my window
        </button>
      );
    } else if (otherActive) {
      title = when;
      detail = (
        <>
          You already have a {otherActive.mine?.status === "booked" ? "booking" : "request running"} for{" "}
          <button type="button" className="font-medium text-accent underline-offset-2 hover:underline" onClick={() => onJump(otherActive.slot)}>
            {formatDayShort(otherActive.slot)} {clockOf(otherActive.slot)}
          </button>
          . One per system.
        </>
      );
      actions = (
        <button type="button" className="btn btn-primary" disabled>Book this slot</button>
      );
    } else {
      title = when;
      detail = `${slot.queued === 0 ? "Nobody queued yet" : `${slot.queued} already queued`}${
        slot.freeOnSite !== null ? ` · ${slot.freeOnSite} free on site` : ""
      }. Booking adds you to the count straight away.`;
      actions = (
        <button type="button" className="btn btn-primary group" disabled={working || !windowValid} onClick={onBook}>
          {working ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {working ? "Queuing…" : "Book this slot"}
          {!working && (
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          )}
        </button>
      );
    }
  }

  return (
    <div
      className="sticky bottom-3 z-20 mt-5 flex flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-3.5 pl-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4"
      role="region"
      aria-label="Selected slot"
    >
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="font-mono text-[0.9375rem] font-semibold text-ink tabular">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted">{detail}</p>
      </div>
      <div className="flex flex-none flex-wrap gap-2">{actions}</div>
    </div>
  );
}
