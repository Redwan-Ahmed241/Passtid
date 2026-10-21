export type QueueLevel = "clear" | "busy" | "hot";

export function queueLevel(n: number): QueueLevel {
  if (n === 0) return "clear";
  if (n <= 3) return "busy";
  return "hot";
}

const LEVEL_TEXT: Record<QueueLevel, string> = {
  clear: "text-clear",
  busy: "text-busy",
  hot: "text-hot",
};
const LEVEL_FILL: Record<QueueLevel, string> = {
  clear: "bg-clear",
  busy: "bg-busy",
  hot: "bg-hot",
};

const TICKS = 6;

/**
 * Queue depth as a row of ascending ticks — a ticket-counter readout.
 * The number is always printed next to the ticks, so colour is never the only signal.
 */
export function QueueMeter({ count, size = "md" }: { count: number; size?: "sm" | "md" }) {
  const level = queueLevel(count);
  const lit = Math.min(count, TICKS);
  const h = size === "sm" ? [6, 8, 10, 12, 14, 16] : [8, 10, 12, 14, 16, 18];
  return (
    <span
      className="inline-flex items-center gap-2.5"
      role="img"
      aria-label={count === 0 ? "Nobody queued" : `${count} ${count === 1 ? "person" : "people"} queued`}
    >
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {h.map((height, i) => (
          <span
            key={i}
            style={{ height }}
            className={`w-[4px] rounded-[1.5px] transition-colors duration-300 ${
              i < lit ? LEVEL_FILL[level] : "bg-[var(--tick-off)]"
            }`}
          />
        ))}
      </span>
      <span className="flex items-baseline gap-1" aria-hidden="true">
        <span
          className={`font-mono font-semibold tabular ${size === "sm" ? "text-sm" : "text-base"} ${
            count === 0 ? LEVEL_TEXT.clear : LEVEL_TEXT[level]
          } min-w-[1.25ch] text-right`}
        >
          {count}
          {count > TICKS ? "+" : ""}
        </span>
        <span className="text-xs text-muted">queued</span>
      </span>
    </span>
  );
}
