"use client";

import { Check, Loader2 } from "lucide-react";
import type { Slot } from "@/lib/types";
import { clockOf, dayOf, formatDayLong, formatDayShort, relativeDay } from "@/lib/time";
import { QueueMeter } from "../queue-meter";

export interface ViewSlot extends Slot {
  inWindow: boolean;
}

interface ListProps {
  slots: ViewSlot[];
  today: string;
  grouped: boolean;
  selected: string | null;
  onSelect: (slot: string) => void;
  dimmed?: boolean;
}

export function SlotList({ slots, today, grouped, selected, onSelect, dimmed }: ListProps) {
  if (!grouped) {
    return (
      <ul className="flex flex-col gap-2" role="list">
        {slots.map((s) => (
          <li key={s.slot} className="@container">
            <SlotRow slot={s} today={today} showDay selected={selected === s.slot} onSelect={onSelect} dimmed={dimmed} />
          </li>
        ))}
      </ul>
    );
  }

  const groups = new Map<string, ViewSlot[]>();
  for (const s of slots) {
    const d = dayOf(s.slot);
    const g = groups.get(d);
    if (g) g.push(s);
    else groups.set(d, [s]);
  }

  return (
    <div className="flex flex-col gap-1">
      {[...groups.entries()].map(([day, items]) => {
        const rel = relativeDay(day, today);
        return (
          <section key={day} aria-label={formatDayLong(day)}>
            <div className="flex items-baseline gap-3 px-0.5 pt-4 pb-2">
              <h3 className="text-[0.9375rem] font-semibold text-ink">{formatDayLong(day)}</h3>
              {rel && (
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium tracking-wide text-accent-ink uppercase">
                  {rel}
                </span>
              )}
              <span className="font-mono text-xs text-muted tabular">
                {items.length} slot{items.length > 1 ? "s" : ""}
              </span>
              <span className="h-px flex-1 self-center bg-line-2" aria-hidden="true" />
            </div>
            <ul className="flex flex-col gap-2" role="list">
              {items.map((s) => (
                <li key={s.slot} className="@container">
                  <SlotRow slot={s} today={today} selected={selected === s.slot} onSelect={onSelect} dimmed={dimmed} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function SlotRow({
  slot: s,
  today,
  selected,
  onSelect,
  showDay,
  dimmed,
}: {
  slot: ViewSlot;
  today: string;
  selected: boolean;
  onSelect: (slot: string) => void;
  showDay?: boolean;
  dimmed?: boolean;
}) {
  const day = dayOf(s.slot);
  const rel = relativeDay(day, today);
  const label = `${formatDayLong(day)} at ${clockOf(s.slot)}, ${s.queued} queued${
    s.freeOnSite !== null ? `, ${s.freeOnSite} free on site` : ""
  }${s.inWindow ? "" : ", outside your window"}${s.mine ? `, your booking is ${s.mine.status}` : ""}`;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(s.slot)}
      className={`group relative flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,opacity] duration-150 ${
        selected
          ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]"
          : "border-line bg-surface hover:border-line-strong hover:shadow-sm"
      } ${dimmed && !selected ? "opacity-60 hover:opacity-100" : ""}`}
    >
      {selected && (
        <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 -left-px w-[3px] rounded-r-full bg-accent" />
      )}

      {/* Narrow: time and queue on the first line, tags on the second. Wide: one line. */}
      <span className="order-1 w-[4.5rem] flex-none">
        <span className="block font-mono text-lg leading-tight font-semibold tracking-tight text-ink tabular">
          {clockOf(s.slot)}
        </span>
        <span className="block text-xs text-muted">{showDay ? (rel ?? formatDayShort(day)) : formatDayShort(day)}</span>
      </span>

      <span className="order-3 flex min-w-0 basis-full flex-wrap items-center gap-1.5 @[30rem]:order-2 @[30rem]:flex-1 @[30rem]:basis-0">
        {s.inWindow ? (
          <Tag tone="accent">In window</Tag>
        ) : (
          <Tag tone="neutral">Outside window</Tag>
        )}
        {s.freeOnSite !== null && (
          <Tag tone={s.freeOnSite <= 1 ? "hot" : s.freeOnSite <= 2 ? "busy" : "neutral"}>
            {s.freeOnSite} free on site
          </Tag>
        )}
        {s.mine?.status === "pending" && (
          <Tag tone="accent-strong">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Yours · booking
          </Tag>
        )}
        {s.mine?.status === "booked" && (
          <Tag tone="clear">
            <Check className="size-3" aria-hidden="true" /> Yours · booked
          </Tag>
        )}
      </span>

      <span className="order-2 ml-auto flex-none @[30rem]:order-3 @[30rem]:ml-0 @[30rem]:min-w-[9.5rem] @[30rem]:border-l @[30rem]:border-line-2 @[30rem]:pl-5">
        <QueueMeter count={s.queued} />
      </span>
    </button>
  );
}

const TONES = {
  neutral: "border-line bg-surface-2 text-ink-2",
  accent: "border-transparent bg-accent-soft text-accent-ink",
  "accent-strong": "border-accent-line bg-surface text-accent-ink",
  clear: "border-clear-line bg-clear-bg text-clear",
  busy: "border-busy-line bg-busy-bg text-busy",
  hot: "border-hot-line bg-hot-bg text-hot",
} as const;

function Tag({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function SlotListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <div className="skeleton mt-4 mb-1 h-4 w-48" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex h-[66px] items-center gap-5 rounded-xl border border-line bg-surface px-4">
          <div className="skeleton h-8 w-16" />
          <div className="skeleton h-5 w-24" />
          <div className="ml-auto skeleton h-5 w-28" />
        </div>
      ))}
    </div>
  );
}
