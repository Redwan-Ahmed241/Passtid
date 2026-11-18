"use client";

import { notFound } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { applyTexts } from "@/lib/i18n";
import { builtinTexts } from "@/lib/i18n/overrides";
import { LANGS, type Lang } from "@/lib/i18n/translations";
import { SYSTEM_INFO } from "@/lib/types";
import type { AdminCustomer, AdminOverview, Booking, BookingRequest, BookingStatus, SystemId, TextOverrides, Ticket } from "@/lib/types";
import { addDays, embassyToday, formatDayShort } from "@/lib/time";
import { describeWindow } from "@/lib/window";
import { useMe } from "../auth/use-me";
import { ApplicantsEditor } from "../booking/applicants-editor";
import { WindowEditor } from "../booking/window-editor";

type Tab = "tickets" | "customers" | "texts";
const TABS: { id: Tab; label: string }[] = [
  { id: "tickets", label: "Tickets" },
  { id: "customers", label: "Customers" },
  { id: "texts", label: "Site texts" },
];

const when = (iso: string) => `${formatDayShort(iso.slice(0, 10), "en-GB")} ${iso.slice(11, 16)}`;
const message = (err: unknown) => (err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");

/**
 * The administrator's workspace: answer support tickets, see and correct any customer's
 * data, and change any text on the site. Internal, so its own labels are English only.
 */
export function AdminPanel() {
  const { loading, user } = useMe();
  const [tab, setTab] = useState<Tab>("tickets");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    return api.adminOverview().then(
      (d) => {
        setData(d);
        setError(null);
        setRefreshing(false);
      },
      (err: unknown) => {
        setError(message(err));
        setRefreshing(false);
      },
    );
  }, []);

  useEffect(() => {
    if (user?.admin) queueMicrotask(() => void load());
  }, [user, load]);

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-16" aria-busy="true" />;
  if (!user?.admin) notFound();

  const openCount = data?.tickets.filter((t) => t.status === "open").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Admin</h1>
        <button type="button" className="btn btn-ghost h-10 min-h-10 px-3.5 text-sm" disabled={refreshing} onClick={() => void load()}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      <div role="tablist" aria-label="Admin sections" className="mt-6 flex gap-6 border-b border-line">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={`-mb-px min-h-11 border-b-2 text-[0.9375rem] font-semibold transition-colors ${
              tab === tb.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tb.label}
            {tb.id === "tickets" && openCount > 0 && (
              <span className="ml-2 rounded-full bg-yellow px-2 py-0.5 font-mono text-xs text-navy tabular">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 border-l-4 border-hot py-1 pl-4 text-sm text-hot">{error}</p>
      )}

      <div className="mt-6">
        {tab === "texts" ? (
          <TextsTab />
        ) : !data ? (
          !error && <Loader2 className="size-5 animate-spin text-muted" aria-label="Loading" />
        ) : tab === "tickets" ? (
          <TicketsTab tickets={data.tickets} onChange={(t) => setData((d) => d && { ...d, tickets: d.tickets.map((x) => (x.token === t.token ? t : x)) })} />
        ) : (
          <CustomersTab customers={data.customers} onReload={load} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tickets                                                             */
/* ------------------------------------------------------------------ */

function TicketsTab({ tickets, onChange }: { tickets: Ticket[]; onChange: (t: Ticket) => void }) {
  if (tickets.length === 0) return <p className="text-muted">No tickets yet.</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {tickets.map((t) => (
        <TicketRow key={t.token} ticket={t} onChange={onChange} />
      ))}
    </ul>
  );
}

function TicketRow({ ticket, onChange }: { ticket: Ticket; onChange: (t: Ticket) => void }) {
  const [reply, setReply] = useState(ticket.reply ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (status: Ticket["status"]) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await api.adminUpdateTicket(ticket.token, { status, reply: reply.trim() || null }));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-mono font-semibold tracking-wider text-ink">{ticket.token}</span>
        <span className={ticket.status === "open" ? "font-semibold text-busy" : "font-semibold text-clear"}>
          {ticket.status === "open" ? "Open" : "Resolved"}
        </span>
        <span className="text-muted">{ticket.category}</span>
        {ticket.system && <span className="text-muted">{SYSTEM_INFO[ticket.system].short}</span>}
        <a href={`mailto:${ticket.email}`} className="text-accent underline-offset-2 hover:underline">{ticket.email}</a>
        <span className="font-mono text-xs text-muted tabular">{when(ticket.createdAt)}</span>
      </p>
      <p className="mt-2 max-w-[70ch] break-words whitespace-pre-line text-ink">{ticket.message}</p>
      <label className="mt-3 block max-w-2xl">
        <span className="mb-1.5 block text-sm font-medium text-ink-2">Answer shown to the user</span>
        <textarea className="field min-h-20 resize-y" maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} />
      </label>
      {error && <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {ticket.status === "open" ? (
          <>
            <button type="button" className="btn btn-primary h-10 min-h-10 text-sm" disabled={busy} onClick={() => void save("resolved")}>
              Save and resolve
            </button>
            <button type="button" className="btn btn-ghost h-10 min-h-10 text-sm" disabled={busy} onClick={() => void save("open")}>
              Save answer
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost h-10 min-h-10 text-sm" disabled={busy} onClick={() => void save("resolved")}>
              Save answer
            </button>
            <button type="button" className="btn btn-ghost h-10 min-h-10 text-sm" disabled={busy} onClick={() => void save("open")}>
              Reopen
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

function CustomersTab({ customers, onReload }: { customers: AdminCustomer[]; onReload: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const shown = customers.filter((c) => c.email.toLowerCase().includes(query.trim().toLowerCase()));
  if (customers.length === 0) return <p className="text-muted">No customers yet.</p>;
  return (
    <>
      <input
        type="search"
        className="field max-w-sm"
        placeholder="Search by email"
        aria-label="Search customers by email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {shown.map((c) => (
          <li key={c.clientId}>
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 py-2 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold text-ink">{c.email || c.clientId}</span>
                <span className="text-sm text-muted">
                  {c.bookings.length} booking{c.bookings.length === 1 ? "" : "s"}
                </span>
                <span className="ml-auto text-sm font-semibold text-accent group-open:hidden">Open</span>
                <span className="ml-auto hidden text-sm font-semibold text-accent group-open:inline">Close</span>
              </summary>
              <div className="pb-6">
                <CustomerDetail customer={c} onReload={onReload} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}

function CustomerDetail({ customer, onReload }: { customer: AdminCustomer; onReload: () => Promise<void> }) {
  const today = embassyToday();
  return (
    <div className="space-y-8">
      {customer.bookings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink">Bookings</h3>
          <ul className="mt-2 space-y-3">
            {customer.bookings.map((b) => (
              <BookingRow key={b.id} booking={b} onReload={onReload} />
            ))}
          </ul>
        </div>
      )}
      {(Object.keys(customer.requests) as SystemId[]).map((system) => {
        const saved = customer.requests[system];
        if (!saved) return null;
        return (
          <RequestEditor
            key={system}
            clientId={customer.clientId}
            system={system}
            saved={saved.request}
            today={today}
            onReload={onReload}
          />
        );
      })}
    </div>
  );
}

const STATUSES: BookingStatus[] = ["pending", "booked", "released"];

function BookingRow({ booking, onReload }: { booking: Booking; onReload: () => Promise<void> }) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [reference, setReference] = useState(booking.reference ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.adminUpdateBooking(booking.id, { status, reference: reference.trim() || null });
      await onReload();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="text-sm">
      <p className="text-ink">
        <span className="font-semibold">{SYSTEM_INFO[booking.system].short}</span>{" "}
        <span className="font-mono tabular">{when(booking.slot)}</span>
        {booking.reason && <span className="text-muted"> · {booking.reason.replace("_", " ")}</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">Status</span>
          <select className="field h-10 min-h-10 w-36 py-0 text-sm" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">Booking number</span>
          <input className="field h-10 min-h-10 w-40 py-0 font-mono text-sm" value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <button type="button" className="btn btn-ghost h-10 min-h-10 text-sm" disabled={busy} onClick={() => void save()}>
          Save
        </button>
      </div>
      {error && <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{error}</p>}
    </li>
  );
}

function RequestEditor({
  clientId,
  system,
  saved,
  today,
  onReload,
}: {
  clientId: string;
  system: SystemId;
  saved: BookingRequest;
  today: string;
  onReload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BookingRequest>(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.adminSaveRequest(clientId, system, draft);
      await onReload();
      setOpen(false);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const names = saved.persons.map((p) => `${p.firstName} ${p.lastName}`.trim()).filter(Boolean).join(", ");

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-ink">{SYSTEM_INFO[system].short} request</h3>
        <button
          type="button"
          className="min-h-11 text-sm font-semibold text-accent hover:text-accent-ink"
          onClick={() => {
            setDraft(saved);
            setOpen((o) => !o);
          }}
        >
          {open ? "Cancel" : "Edit"}
        </button>
      </div>
      {!open ? (
        <p className="text-sm text-ink-2">
          {names || "No names yet"} · {describeWindow(saved.window, "en")}
        </p>
      ) : (
        <div className="mt-3 max-w-xl">
          <ApplicantsEditor
            system={system}
            persons={draft.persons}
            email={draft.email}
            showAll
            onChange={({ persons, email }) => setDraft((d) => ({ ...d, persons, email }))}
          />
          <div className="mt-6">
            <WindowEditor
              value={draft.window}
              today={today}
              horizon={addDays(today, SYSTEM_INFO[system].scanWeeks * 7 - 1)}
              onChange={(window) => setDraft((d) => ({ ...d, window }))}
            />
          </div>
          {error && <p role="alert" className="mt-2 text-[0.8125rem] text-hot">{error}</p>}
          <button type="button" className="btn btn-primary mt-4" disabled={busy} onClick={() => void save()}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save changes
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Site texts                                                          */
/* ------------------------------------------------------------------ */

const MAX_SHOWN = 60;

function TextsTab() {
  const [lang, setLang] = useState<Lang>("en");
  const [query, setQuery] = useState("");
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [saved, setSaved] = useState<TextOverrides | null>(null);
  /** Unsaved edits per language: a string to set, null to restore the built-in text. */
  const [dirty, setDirty] = useState<Record<Lang, Record<string, string | null>>>({ en: {}, sv: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.texts().then(setSaved, (err: unknown) => setError(message(err)));
  }, []);

  const defaults = useMemo(() => builtinTexts(lang), [lang]);
  const paths = useMemo(() => Object.keys(defaults), [defaults]);

  if (!saved) {
    return error ? <p role="alert" className="text-sm text-hot">{error}</p> : <Loader2 className="size-5 animate-spin text-muted" aria-label="Loading" />;
  }

  const q = query.trim().toLowerCase();
  const current = (path: string) => {
    const d = dirty[lang][path];
    return d !== undefined ? (d ?? defaults[path]) : (saved[lang][path] ?? defaults[path]);
  };
  const isEdited = (path: string) => (dirty[lang][path] !== undefined ? dirty[lang][path] !== null : saved[lang][path] !== undefined);
  const matches = paths.filter(
    (p) => (!onlyEdited || isEdited(p)) && (!q || p.toLowerCase().includes(q) || current(p).toLowerCase().includes(q)),
  );
  const dirtyCount = Object.keys(dirty.en).length + Object.keys(dirty.sv).length;

  const edit = (path: string, value: string) =>
    setDirty((d) => {
      const next = { ...d[lang] };
      // Typing the text back to what is stored is not a change.
      if (value === (saved[lang][path] ?? defaults[path])) delete next[path];
      else next[path] = value === defaults[path] ? null : value;
      return { ...d, [lang]: next };
    });

  const reset = (path: string) =>
    setDirty((d) => {
      const next = { ...d[lang] };
      if (saved[lang][path] === undefined) delete next[path];
      else next[path] = null;
      return { ...d, [lang]: next };
    });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.adminSetTexts(dirty);
      setSaved(next);
      applyTexts(next);
      setDirty({ en: {}, sv: {} });
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Language" className="inline-flex h-11 rounded-[0.625rem] border border-line bg-surface p-0.5">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className="min-w-11 rounded-lg px-2 text-xs font-semibold text-muted uppercase transition-colors hover:text-ink aria-pressed:bg-accent aria-pressed:text-white"
            >
              {l}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="field max-w-xs"
          placeholder="Search texts"
          aria-label="Search texts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="size-4 accent-[#006aa7]" checked={onlyEdited} onChange={(e) => setOnlyEdited(e.target.checked)} />
          Only changed
        </label>
        <button type="button" className="btn btn-primary ml-auto" disabled={busy || dirtyCount === 0} onClick={() => void save()}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}` : "Saved"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-hot">{error}</p>}
      <p className="mt-3 text-sm text-muted tabular">
        {matches.length} of {paths.length} texts{matches.length > MAX_SHOWN ? `, showing the first ${MAX_SHOWN}. Search to narrow it down.` : "."} Keep
        placeholders such as {"{price}"} as they are.
      </p>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {matches.slice(0, MAX_SHOWN).map((path) => (
          <li key={`${lang}:${path}`} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <label htmlFor={`txt-${path}`} className="font-mono text-xs break-all text-muted">
                {path}
              </label>
              {isEdited(path) && (
                <button type="button" className="min-h-11 text-sm font-semibold text-accent hover:text-accent-ink sm:min-h-0" onClick={() => reset(path)}>
                  Restore original
                </button>
              )}
            </div>
            <textarea
              id={`txt-${path}`}
              rows={Math.min(8, Math.max(1, Math.ceil(current(path).length / 80)))}
              className={`field mt-1.5 resize-y text-[0.9375rem] ${isEdited(path) ? "border-accent" : ""}`}
              maxLength={5000}
              value={current(path)}
              onChange={(e) => edit(path, e.target.value)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
