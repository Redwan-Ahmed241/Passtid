import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "invalid" | "error";

/** Autosave status for the booking request. Always text plus icon, never colour alone. */
export function SaveBadge({ state }: { state: SaveState }) {
  const map = {
    idle: null,
    saving: { icon: <Loader2 className="size-3.5 animate-spin" />, text: "Saving", cls: "text-muted" },
    saved: { icon: <Check className="size-3.5" />, text: "Saved", cls: "text-clear" },
    invalid: { icon: <AlertTriangle className="size-3.5" />, text: "Not saved", cls: "text-hot" },
    error: { icon: <CloudOff className="size-3.5" />, text: "Offline", cls: "text-hot" },
  } as const;
  const s = map[state];
  return (
    <span aria-live="polite" className="min-h-5">
      {s && (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.cls}`}>
          <span aria-hidden="true">{s.icon}</span>
          {s.text}
        </span>
      )}
    </span>
  );
}
