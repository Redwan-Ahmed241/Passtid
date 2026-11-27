"use client";

import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { SYSTEM_INFO } from "@/lib/types";
import type { AdminCustomer, AdminOverview, Booking, BookingRequest, BookingStatus, SystemId, Ticket, TicketCategory } from "@/lib/types";
import { addDays, embassyToday, formatDayShort } from "@/lib/time";
import { describeWindow } from "@/lib/window";
import { useMe } from "../auth/use-me";
import { ApplicantsEditor } from "../booking/applicants-editor";
import { WindowEditor } from "../booking/window-editor";
import { FeedbackTab } from "./feedback-tab";
import { SiteTexts } from "./site-texts";

type Tab = "tickets" | "feedback" | "customers" | "texts";
const TABS: { id: Tab; label: string }[] = [
  { id: "tickets", label: "Tickets" },
  { id: "feedback", label: "Feedback" },
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

  const badges: Partial<Record<Tab, number>> = {
    tickets: data?.tickets.filter((t) => t.status === "open").length,
    feedback: data?.feedback.filter((f) => f.status === "waiting").length,
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Admin</h1>
        <button type="button" className="btn btn-ghost h-10 min-h-10 px-3.5 text-sm" disabled={refreshing} onClick={() => void load()}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      <div role="tablist" aria-label="Admin sections" className="mt-6 flex flex-wrap gap-x-4 border-b border-line sm:gap-x-6">
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
            className={`min-h-11 shrink-0 border-b-2 text-[0.9375rem] font-semibold transition-colors ${
              tab === tb.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tb.label}
            {!!badges[tb.id] && (
              <span className="ml-2 rounded-full bg-yellow px-2 py-0.5 font-mono text-xs text-navy tabular">{badges[tb.id]}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-hot-line bg-hot-bg px-4 py-2.5 text-sm text-hot">{error}</p>
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
        ) : tab === "feedback" ? (
          <FeedbackTab items={data.feedback} onReload={load} />
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

/** What happened to a booking, in words an administrator can act on. */
function bookingState({ status, reason }: Booking): { label: string; tone: string } {
  if (status === "booked") return { label: "Booked", tone: "bg-clear-bg text-clear" };
  if (status === "pending") return { label: "Waiting to be booked", tone: "bg-busy-bg text-busy" };
  if (reason === "failed") return { label: "Could not be booked", tone: "bg-hot-bg text-hot" };
  const label = reason === "timed_out" ? "Timed out" : reason === "slot_gone" ? "Time was taken" : "Cancelled";
  return { label, tone: "bg-sunken text-ink-2" };
}

function bookingSummary(bookings: Booking[]): string {
  if (bookings.length === 0) return "No bookings";
  const count = (status: BookingStatus) => bookings.filter((b) => b.status === status).length;
  return [
    [count("booked"), "booked"],
    [count("pending"), "waiting"],
    [count("released"), "not booked"],
  ]
    .filter(([n]) => n)
    .map(([n, word]) => `${n} ${word}`)
    .join(" · ");
}

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
      {shown.length === 0 && <p className="mt-4 text-sm text-muted">No customer matches that email.</p>}
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {shown.map((c) => (
          <li key={c.clientId}>
            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90" aria-hidden="true" />
                <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="block truncate font-semibold text-ink">{c.email || c.clientId}</span>
                  <span className="block shrink-0 text-sm text-muted tabular">{bookingSummary(c.bookings)}</span>
                </span>
              </summary>
              <div className="pb-6 sm:pl-7">
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
  const systems = Object.keys(customer.requests) as SystemId[];
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface px-4 sm:px-5">
      {customer.bookings.length > 0 && (
        <section className="pt-4 pb-1">
          <h3 className="text-base font-semibold text-ink">Bookings</h3>
          <ul className="mt-1 divide-y divide-line">
            {customer.bookings.map((b) => (
              // Remounted when the booking changes, so an open form never saves over what the bot just did.
              <BookingRow key={`${b.id}:${b.updatedAt}`} booking={b} onReload={onReload} />
            ))}
          </ul>
        </section>
      )}
      {systems.map((system) => {
        const saved = customer.requests[system];
        if (!saved) return null;
        return (
          <RequestEditor
            key={system}
            clientId={customer.clientId}
            system={system}
            saved={saved.request}
            complete={saved.complete}
            today={today}
            onReload={onReload}
          />
        );
      })}
    </div>
  );
}

const STATUSES: BookingStatus[] = ["pending", "booked", "released"];

/** Said under the status choice, so nobody changes one without knowing what the bot will then do. */
const STATUS_HELP: Record<BookingStatus, string> = {
  pending: "The booking bot will try to book this time.",
  booked: "Enter the booking number you got from the embassy.",
  released: "The booking bot will stop working on this time.",
};

const textButton = "min-h-11 shrink-0 text-sm font-semibold text-accent hover:text-accent-ink";

function BookingRow({ booking, onReload }: { booking: Booking; onReload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [reference, setReference] = useState(booking.reference ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = bookingState(booking);
  const number = reference.trim();
  const changed = status !== booking.status || (status === "booked" && number !== (booking.reference ?? ""));
  const ready = changed && (status !== "booked" || number !== "");

  const toggle = () => {
    setStatus(booking.status);
    setReference(booking.reference ?? "");
    setError(null);
    setOpen((o) => !o);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.adminUpdateBooking(booking.id, { status, reference: number || null });
      await onReload();
      setOpen(false);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-ink">{SYSTEM_INFO[booking.system].short}</span>
            <span className="text-ink-2 tabular">{when(booking.slot)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
          </p>
          {booking.reference && <p className="mt-1 text-sm text-muted">Booking number {booking.reference}</p>}
        </div>
        <button type="button" className={textButton} aria-expanded={open} onClick={toggle}>
          {open ? "Close" : "Change"}
          <span className="sr-only"> booking, {SYSTEM_INFO[booking.system].short} {when(booking.slot)}</span>
        </button>
      </div>
      {open && (
        <form
          className="mt-2 max-w-md space-y-3 pb-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) void save();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Status</span>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_NAMES[s]}</option>
              ))}
            </select>
            {changed && <span className="mt-1.5 block text-[0.8125rem] text-muted">{STATUS_HELP[status]}</span>}
          </label>
          {status === "booked" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-2">Booking number</span>
              <input className="field tabular" maxLength={40} required value={reference} onChange={(e) => setReference(e.target.value)} />
            </label>
          )}
          {error && <p role="alert" className="text-[0.8125rem] text-hot">{error}</p>}
          <button type="submit" className="btn btn-primary h-10 min-h-10 text-sm" disabled={busy || !ready}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save change
          </button>
        </form>
      )}
    </li>
  );
}

function RequestEditor({
  clientId,
  system,
  saved,
  complete,
  today,
  onReload,
}: {
  clientId: string;
  system: SystemId;
  saved: BookingRequest;
  complete: boolean;
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
    <section className="py-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold text-ink">
          {SYSTEM_INFO[system].short} request
          {names && !complete && (
            <span className="rounded-full bg-busy-bg px-2.5 py-0.5 text-xs font-semibold text-busy">Details missing</span>
          )}
        </h3>
        <button
          type="button"
          className={textButton}
          aria-expanded={open}
          onClick={() => {
            setDraft(saved);
            setError(null);
            setOpen((o) => !o);
          }}
        >
          {open ? "Cancel" : names ? "Edit" : "Fill in"}
          <span className="sr-only"> {SYSTEM_INFO[system].short} request</span>
        </button>
      </div>
      {!open ? (
        names ? (
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">{saved.persons.length > 1 ? "People" : "Person"}</dt>
            <dd className="break-words text-ink">{names}</dd>
            <dt className="text-muted">Wanted time</dt>
            <dd className="text-ink first-letter:uppercase">{describeWindow(saved.window, "en")}</dd>
            {saved.email && (
              <>
                <dt className="text-muted">Contact</dt>
                <dd className="break-all text-ink">{saved.email}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted">Nothing filled in yet.</p>
        )
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
    </section>
  );
}
