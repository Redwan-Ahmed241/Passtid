"use client";

import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { SYSTEM_INFO } from "@/lib/types";
import type { AdminCustomer, AdminOverview, Booking, BookingRequest, BookingStatus, SystemId, Ticket, TicketCategory } from "@/lib/types";
import { addDays, embassyToday, formatDayShort } from "@/lib/time";
import { describeWindow } from "@/lib/window";
import { useMe } from "../auth/use-me";
import { ApplicantsEditor } from "../booking/applicants-editor";
import { WindowEditor } from "../booking/window-editor";
import { SiteTexts } from "./site-texts";

type Tab = "tickets" | "customers" | "texts";
const TABS: { id: Tab; label: string }[] = [
  { id: "tickets", label: "Tickets" },
  { id: "customers", label: "Customers" },
  { id: "texts", label: "Website texts" },
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
  /** Once opened, the text editor stays mounted so switching tabs never loses unsaved wording. */
  const [textsOpened, setTextsOpened] = useState(false);
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
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
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
            onClick={() => {
              setTab(tb.id);
              if (tb.id === "texts") setTextsOpened(true);
            }}
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
        {textsOpened && (
          <div hidden={tab !== "texts"}>
            <SiteTexts />
          </div>
        )}
        {tab === "texts" ? null : !data ? (
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

const CATEGORY_NAMES: Record<TicketCategory, string> = { booking: "Booking", payment: "Payment", account: "Account", other: "Something else" };
const STATUS_NAMES: Record<BookingStatus, string> = { pending: "Waiting to be booked", booked: "Booked", released: "Cancelled" };

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
        <span className="text-muted">{CATEGORY_NAMES[ticket.category]}</span>
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
          <select className="field h-10 min-h-10 w-52 py-0 text-sm" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_NAMES[s]}</option>
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
