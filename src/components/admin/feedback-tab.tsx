"use client";

import { useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDayShort } from "@/lib/time";
import type { AdminFeedback, FeedbackStatus } from "@/lib/types";
import { RatingStars } from "../rating-stars";

const STATES: Record<FeedbackStatus, { label: string; tone: string }> = {
  waiting: { label: "Waiting for you", tone: "bg-busy-bg text-busy" },
  published: { label: "On the website", tone: "bg-clear-bg text-clear" },
  hidden: { label: "Hidden", tone: "bg-sunken text-ink-2" },
};

export function FeedbackTab({ items, onReload }: { items: AdminFeedback[]; onReload: () => Promise<void> }) {
  return (
    <>
      <p className="max-w-[70ch] text-sm text-ink-2">
        Customers who have paid can send feedback. Publish honest feedback, critical or not. Showing only the good
        reviews can break consumer law, so hide only spam, abuse or private details.
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-muted">No feedback yet. Customers find the form at the bottom of the booking page.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {items.map((f) => (
            <FeedbackRow key={f.clientId} item={f} onReload={onReload} />
          ))}
        </ul>
      )}
    </>
  );
}

function FeedbackRow({ item, onReload }: { item: AdminFeedback; onReload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = async (status: FeedbackStatus) => {
    setBusy(true);
    setError(null);
    try {
      await api.adminSetFeedbackStatus(item.clientId, status, item.updatedAt);
      await onReload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const [confirming, setConfirming] = useState(false);
  const erase = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.adminDeleteFeedback(item.clientId);
      await onReload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  const state = STATES[item.status];
  return (
    <li className="py-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <RatingStars rating={item.rating} label={`${item.rating} out of 5`} />
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
        <span className="font-semibold text-ink">{item.name}</span>
        <a href={`mailto:${item.email}`} className="break-all text-accent underline-offset-2 hover:underline">{item.email}</a>
        <span className="text-muted tabular">{formatDayShort(item.updatedAt.slice(0, 10), "en-GB")}</span>
      </p>
      <p className="mt-2 max-w-[70ch] break-words whitespace-pre-line text-ink">{item.message}</p>
      {!item.allowPublic && <p className="mt-2 text-sm text-muted">The customer did not agree to show this publicly.</p>}
      {error && <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {item.allowPublic && item.status !== "published" && (
          <button type="button" className="btn btn-primary h-10 min-h-10 text-sm" disabled={busy} onClick={() => void set("published")}>
            Publish on website
          </button>
        )}
        {item.status !== "hidden" && (
          <button type="button" className="btn btn-ghost h-10 min-h-10 text-sm" disabled={busy} onClick={() => void set("hidden")}>
            {item.status === "published" ? "Take off website" : "Hide"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger h-10 min-h-10 text-sm"
          disabled={busy}
          onClick={() => (confirming ? void erase() : setConfirming(true))}
          onBlur={() => setConfirming(false)}
        >
          {confirming ? "Click again to delete for good" : "Delete (customer asked)"}
        </button>
      </div>
    </li>
  );
}
