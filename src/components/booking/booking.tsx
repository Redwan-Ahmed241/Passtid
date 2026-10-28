"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, BellRing, Bot, Check, CreditCard, Globe2, Loader2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatPrice } from "@/lib/plans";
import { LOCALES, useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { isComplete } from "@/lib/applicants";
import { defaultRequest } from "@/lib/defaults";
import {
  SYSTEMS,
  SYSTEM_INFO,
  isSystemId,
  type BookingRequest,
  type AlertSubscription,
  type BookingWindow,
  type PlanId,
  type PlansResponse,
  type SlotsResponse,
  type SystemId,
} from "@/lib/types";
import { EMBASSY_TZ, addDays, clockOf, dayOf, embassyToday, formatDayLong, formatDayShort } from "@/lib/time";
import { describeWindow, matchesWindow, validateWindow } from "@/lib/window";
import { announceAuthChange, useMe } from "../auth/use-me";
import { ApplicantsEditor } from "./applicants-editor";
import { SlotListSkeleton, type ViewSlot } from "./slot-list";
import { WindowEditor } from "./window-editor";

const POLL_SLOTS_MS = 15_000;
const POLL_BOOKING_MS = 1_500;

type Step = 1 | 2 | 3 | 4;
const STEP_KEYS: Record<Step, TranslationKey> = { 1: "stepService", 2: "stepDateTime", 3: "stepDetails", 4: "stepConfirm" };

const sameRequest = (a: BookingRequest, b: BookingRequest) => JSON.stringify(a) === JSON.stringify(b);

export function Booking() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("system");
  const system: SystemId = requested === "coordination" ? "coordination_number" : isSystemId(requested) ? requested : "passport";
  const { loading: authLoading, user } = useMe();
  const { t, lang } = useI18n();
  const locale = LOCALES[lang];
  const slotLabel = useCallback((iso: string) => `${formatDayShort(iso, locale)} ${clockOf(iso)}`, [locale]);

  // Coming back from a cancelled payment lands on the review step again.
  const [step, setStep] = useState<Step>(params.get("checkout") === "cancel" ? 4 : 1);
  /** The person asked to book another service even though this one already has a booking. */
  const [startNew, setStartNew] = useState(false);
  const [consent, setConsent] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<SystemId, BookingRequest>>>({});
  const [saved, setSaved] = useState<Partial<Record<SystemId, BookingRequest>>>({});
  const [slotsBy, setSlotsBy] = useState<Partial<Record<SystemId, SlotsResponse>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [plan, setPlan] = useState<PlanId>(params.get("plan") === "notify" ? "notify" : "autobook");
  const [alertSub, setAlertSub] = useState<AlertSubscription | null>(null);
  const [watching, setWatching] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [showAccountErrors, setShowAccountErrors] = useState(false);
  const [showDetailErrors, setShowDetailErrors] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string; tone: "ok" | "warn" } | null>(null);

  const announced = useRef(new Set<string>());
  const requestedFor = useRef(new Set<SystemId>());
  const confirmedSessions = useRef(new Set<string>());

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
          setLoadError(err instanceof ApiRequestError ? err.message : t("loadSlotsFail"));
          return null;
        },
      ),
    [handleAuthLoss, t],
  );

  /* ----------------------------- effects ----------------------------- */

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
        if (!handleAuthLoss(err)) setLoadError(t("loadReqFail"));
      },
    );
  }, [system, user, handleAuthLoss, t]);

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

  // Guests can go through every step; the account is created at the end, right before paying.
  const guest = !authLoading && !user;
  const guestDefault = useMemo(() => defaultRequest(embassyToday(), ""), []);
  const draft = drafts[system] ?? (guest ? guestDefault : null);
  const savedReq = saved[system] ?? null;
  const windowValid = draft ? validateWindow(draft.window).length === 0 : true;
  const detailsReady = draft ? isComplete(system, draft) : false;

  // Autosave once the window is valid and something changed. People and email may still be a draft.
  useEffect(() => {
    if (!draft || !savedReq || sameRequest(draft, savedReq) || validateWindow(draft.window).length) return;
    const t = setTimeout(() => {
      api.saveRequest(system, draft).then(
        () => setSaved((s) => ({ ...s, [system]: draft })),
        (err: unknown) => void handleAuthLoss(err),
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
              notify(t("nBooked", { slot: slotLabel(b.slot), ref: b.reference ?? "" }));
            } else if (b.reason !== "cancelled") {
              const why = t(b.reason === "timed_out" ? "whyTimeout" : "whyGone");
              notify(t("nFailed", { why, slot: slotLabel(b.slot), depth }), "warn");
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

  // Prices come from the server, so the UI never hard-codes them.
  useEffect(() => {
    if (plans) return;
    api.plans().then(setPlans, (err: unknown) => {
      if (!handleAuthLoss(err)) notify(t("loadPlansFail"), "warn");
    });
  }, [plans, handleAuthLoss, notify, t]);

  // Back from Stripe: verify the payment, then show what was bought. Runs once per checkout session.
  const checkoutState = params.get("checkout");
  const sessionId = params.get("session_id");
  useEffect(() => {
    if (!user || !checkoutState) return;
    const clean = () => {
      const q = new URLSearchParams(params.toString());
      q.delete("checkout");
      q.delete("session_id");
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };
    if (checkoutState === "cancel") {
      queueMicrotask(() => notify(t("payCancelled"), "warn"));
      clean();
      return;
    }
    if (checkoutState !== "success" || !sessionId || confirmedSessions.current.has(sessionId)) return;
    confirmedSessions.current.add(sessionId);
    queueMicrotask(() => notify(t("payConfirming")));
    api.confirmCheckout(sessionId).then(
      async (res) => {
        if (res.alert) {
          setAlertSub(res.alert);
          setStartNew(false);
        }
        if (res.watching) {
          setWatching(true);
          setStartNew(false);
        }
        if (res.booking) {
          setStartNew(false);
          await loadSlots(res.system);
        }
        notify(t("payConfirmed"));
        clean();
      },
      (err: unknown) => {
        if (handleAuthLoss(err)) return;
        setStep(4);
        notify(err instanceof ApiRequestError ? err.message : t("payFail"), "warn");
        clean();
      },
    );
    // params/pathname/router are only read to rewrite the URL once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, checkoutState, sessionId]);

  // Each step starts at the top, like turning a page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  /* ----------------------------- derived ----------------------------- */

  // The bot keeps using the last valid window while the draft window is broken.
  const effectiveWindow: BookingWindow | null = draft ? (windowValid ? draft.window : (savedReq?.window ?? null)) : null;
  const guestData = useMemo<SlotsResponse>(() => {
    const today = embassyToday();
    const weeks = SYSTEM_INFO[system].scanWeeks;
    return {
      system,
      timezone: EMBASSY_TZ,
      today,
      scannedUntil: addDays(today, weeks * 7 - 1),
      scanWeeks: weeks,
      generatedAt: new Date().toISOString(),
      slots: [],
    };
  }, [system]);
  const data = slotsBy[system] ?? (guest ? guestData : undefined);

  const view = useMemo<ViewSlot[]>(() => {
    if (!data || !effectiveWindow) return [];
    return data.slots.map((s) => ({ ...s, inWindow: matchesWindow(s.slot, effectiveWindow) }));
  }, [data, effectiveWindow]);

  // No slot picker: the bot books the earliest open slot that fits the window ("As soon as possible" fits all).
  const selectedSlot = useMemo(
    () => view.filter((s) => s.inWindow).sort((x, y) => x.slot.localeCompare(y.slot))[0] ?? null,
    [view],
  );
  const mineSlot = view.find((s) => s.mine) ?? null;
  const showStatus = !!mineSlot && !startNew;
  const showAlert = !showStatus && !!alertSub && alertSub.system === system && !startNew;
  const showWatching = !showStatus && !showAlert && watching && !startNew;

  /* ----------------------------- actions ----------------------------- */

  const chooseSystem = (next: SystemId) => {
    if (next !== system) {
      const q = new URLSearchParams(params.toString());
      if (next === "passport") q.delete("system");
      else q.set("system", next);
      const qs = q.toString();
      setShowDetailErrors(false);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    setStartNew(false);
    setStep(2);
  };

  const setDraft = (update: (r: BookingRequest) => BookingRequest) =>
    setDrafts((d) => {
      const current = d[system] ?? (guest ? guestDefault : null);
      return current ? { ...d, [system]: update(current) } : d;
    });

  const goDetails = () => {
    if (!windowValid) return;
    setStep(3);
  };

  /** Step 3 -> 4, or show what is missing. */
  const goConfirm = () => {
    if (!detailsReady || !consent) {
      setShowDetailErrors(true);
      setTimeout(() => {
        document.querySelector<HTMLElement>("#details input[aria-invalid='true']")?.focus();
      }, 50);
      return;
    }
    setStep(4);
  };

  /** Step 4: make sure the backend has the latest request, then send the browser to checkout. */
  const pay = async () => {
    if (!draft || !effectiveWindow) return;
    if (!detailsReady) {
      setStep(3);
      setShowDetailErrors(true);
      return;
    }
    if (!user && (!accountName.trim() || accountPassword.length < 8)) {
      setShowAccountErrors(true);
      return;
    }
    setWorking(true);
    try {
      // Guests create their account now, with the contact email they already gave.
      if (!user) announceAuthChange(await api.register(accountName.trim(), draft.email, accountPassword));
      const req: BookingRequest = windowValid ? draft : { ...draft, window: effectiveWindow };
      if (!savedReq || !sameRequest(req, savedReq)) {
        await api.saveRequest(system, req);
        setSaved((s) => ({ ...s, [system]: req }));
        setDrafts((d) => ({ ...d, [system]: req }));
      }
      const checkout = await api.checkout(system, plan, plan === "autobook" ? (selectedSlot?.slot ?? null) : null);
      window.location.assign(checkout.url);
      // Stay "working" while the browser leaves for the payment page.
    } catch (err) {
      setWorking(false);
      if (handleAuthLoss(err)) return;
      notify(err instanceof ApiRequestError ? err.message : t("payFail"), "warn");
      if (err instanceof ApiRequestError && err.code === "incomplete_details") {
        setStep(3);
        setShowDetailErrors(true);
      }
    }
  };

  const cancel = async (bookingId: string) => {
    setWorking(true);
    try {
      announced.current.add(bookingId);
      const b = await api.cancel(bookingId);
      const fresh = await loadSlots(b.system);
      const depth = fresh?.slots.find((s) => s.slot === b.slot)?.queued ?? 0;
      notify(t("nCancelled", { slot: slotLabel(b.slot), depth }));
      setConfirmingCancel(false);
      setStep(1);
    } catch (err) {
      announced.current.delete(bookingId);
      if (!handleAuthLoss(err)) notify(err instanceof ApiRequestError ? err.message : t("cancelFail"), "warn");
    } finally {
      setWorking(false);
    }
  };

  /* ----------------------------- render ----------------------------- */

  if (authLoading) return <BookingFallback />;

  const ready = !!data && !!draft && !!effectiveWindow;
  const inFlow = ready && !showStatus && !showAlert && !showWatching;
  const names = draft?.persons.map((p) => `${p.firstName} ${p.lastName}`.trim()).filter(Boolean).join(", ") ?? "";
  const planPrice = plans?.plans.find((p) => p.id === plan);
  const serviceName = t(system === "passport" ? "svcPassport" : "svcCoordShort");
  const heading = "text-2xl font-bold text-ink sm:text-3xl";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-28 lg:pb-16">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-14">
        <div className={`min-w-0 max-w-xl ${inFlow ? "" : "mx-auto"}`}>
          {!showStatus && !showAlert && !showWatching && (
            <ol className="mb-8 grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as const).map((n) => (
                <li key={n} aria-current={n === step ? "step" : undefined}>
                  <span className={`block h-1.5 rounded-full ${n <= step ? "bg-accent" : "bg-line"}`} aria-hidden="true" />
                  <span className={`mt-2 block text-[0.8125rem] ${n === step ? "font-semibold text-ink" : "text-muted"}`}>
                    {t(STEP_KEYS[n])}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {loadError && !data && step > 1 && (
            <div role="alert" className="border-l-4 border-hot py-1 pl-4">
              <p className="flex items-center gap-2 font-semibold text-hot">
                <AlertTriangle className="size-4" aria-hidden="true" /> {t("cantReach")}
              </p>
              <p className="mt-1 text-sm text-ink-2">{loadError}</p>
              <button type="button" className="btn btn-ghost mt-3" onClick={() => void loadSlots(system)}>
                {t("tryAgain")}
              </button>
            </div>
          )}

          {!ready && !loadError && <SlotListSkeleton />}

          {ready && showStatus && mineSlot && draft && (
            <StatusCard
              system={system}
              slot={mineSlot}
              people={draft.persons.length}
              email={draft.email}
              working={working}
              confirming={confirmingCancel}
              onAskCancel={() => setConfirmingCancel(true)}
              onKeep={() => setConfirmingCancel(false)}
              onCancel={() => mineSlot.mine && void cancel(mineSlot.mine.bookingId)}
              onAnother={() => {
                setStartNew(true);
                setStep(1);
              }}
            />
          )}

          {ready && showAlert && alertSub && (
            <AlertCard
              alert={alertSub}
              onAnother={() => {
                setStartNew(true);
                setAlertSub(null);
                setStep(1);
              }}
            />
          )}

          {ready && showWatching && (
            <WatchingCard
              onAnother={() => {
                setStartNew(true);
                setWatching(false);
                setStep(1);
              }}
            />
          )}

          {inFlow && step === 1 && (
            <>
              <h1 className={heading}>{t("whatNeed")}</h1>
              <div className="mt-6 flex flex-col gap-3">
                {SYSTEMS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={system === id}
                    onClick={() => chooseSystem(id)}
                    className="flex min-h-20 items-center gap-4 rounded-xl border border-line-strong bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft aria-pressed:border-accent aria-pressed:bg-accent-soft"
                  >
                    <span className="grid size-11 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
                      {id === "passport" ? <CreditCard className="size-5" aria-hidden="true" /> : <Globe2 className="size-5" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{t(id === "passport" ? "svcPassport" : "svcCoord")}</span>
                      <span className="mt-0.5 block text-sm text-muted">{t(id === "passport" ? "passportDesc" : "coordDesc")}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {inFlow && step === 2 && data && draft && (
            <>
              <h1 className={heading}>{t("chooseDateTime")}</h1>
              <div className="mt-5">
                <WindowEditor
                  value={draft.window}
                  today={data.today}
                  horizon={data.scannedUntil}
                  onChange={(window) => setDraft((r) => ({ ...r, window }))}
                />
              </div>
              <StepButtons onBack={() => setStep(1)} onNext={goDetails} nextDisabled={!windowValid} />
            </>
          )}

          {inFlow && step === 3 && draft && (
            <div id="details">
              <ApplicantsEditor
                key={system}
                system={system}
                persons={draft.persons}
                email={draft.email}
                showAll={showDetailErrors}
                onChange={({ persons, email }) => setDraft((r) => ({ ...r, persons, email }))}
              />
              <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-invalid={showDetailErrors && !consent}
                  className="mt-0.5 size-5 flex-none accent-[#006aa7]"
                />
                <span>
                  {t("gdpr")}{" "}
                  <Link href="/privacy" target="_blank" className="font-semibold text-accent underline-offset-2 hover:underline">
                    {t("navPrivacy")}
                  </Link>{" "}
                  {t("gdprAnd")}{" "}
                  <Link href="/terms" target="_blank" className="font-semibold text-accent underline-offset-2 hover:underline">
                    {t("navTerms")}
                  </Link>
                  .
                </span>
              </label>
              {showDetailErrors && !consent && (
                <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">
                  {t("tickBox")}
                </p>
              )}
              <StepButtons onBack={() => setStep(2)} onNext={goConfirm} />
            </div>
          )}

          {inFlow && step === 4 && draft && (
            <>
              <h1 className={heading}>{t("reviewBooking")}</h1>
              {/* On wide screens the summary beside the form already shows this. */}
              <dl className="mt-4 divide-y divide-line text-sm lg:hidden">
                <Row label={t("rowService")} value={serviceName} />
                <Row label={t("rowDates")} value={describeWindow(draft.window, lang)} />
                <Row label={t("rowName")} value={names || t("nameMissing")} />
                <Row label={t("rowEmail")} value={draft.email} />
                <Row label={t("rowApplicants")} value={String(draft.persons.length)} />
              </dl>

              <div role="radiogroup" aria-label={t("planTitle")} className="mt-6 divide-y divide-line border-y border-line">
                {(["autobook", "notify"] as const).map((id) => {
                  const on = plan === id;
                  const price = plans?.plans.find((p) => p.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPlan(id)}
                      className="flex w-full min-w-0 items-start gap-3 py-4 text-left"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid size-5 flex-none place-items-center rounded-full border-2 ${
                          on ? "border-accent bg-accent text-[var(--on-accent)]" : "border-line-strong"
                        }`}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="flex items-center gap-1.5 font-semibold text-ink">
                            {id === "autobook" ? (
                              <Bot className="size-4 flex-none text-accent" aria-hidden="true" />
                            ) : (
                              <BellRing className="size-4 flex-none text-accent" aria-hidden="true" />
                            )}
                            {t(id === "autobook" ? "planAutoName" : "planNotifyName")}
                          </span>
                          <span className="font-mono text-sm font-semibold text-ink tabular">{price ? formatPrice(price) : "…"}</span>
                        </span>
                        <span className="mt-1 block text-[0.8125rem] text-muted">
                          {t(id === "autobook" ? "planAutoDesc" : "planNotifyDesc")}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {guest && (
                <div className="mt-6">
                  <p className="font-semibold text-ink">{t("accountTitle")}</p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label htmlFor="acct-name" className="mb-1.5 block text-sm font-medium text-ink-2">{t("fullName")}</label>
                      <input
                        id="acct-name"
                        className="field"
                        autoComplete="name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        aria-invalid={showAccountErrors && !accountName.trim()}
                      />
                      {showAccountErrors && !accountName.trim() && (
                        <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{t("errEnterName")}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="acct-pass" className="mb-1.5 block text-sm font-medium text-ink-2">{t("password")}</label>
                      <input
                        id="acct-pass"
                        className="field"
                        type="password"
                        autoComplete="new-password"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        aria-invalid={showAccountErrors && accountPassword.length < 8}
                      />
                      {showAccountErrors && accountPassword.length < 8 && (
                        <p role="alert" className="mt-1.5 text-[0.8125rem] text-hot">{t("errPassword8")}</p>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">
                    {t("haveAccount")}{" "}
                    <Link
                      href={`/login?next=${encodeURIComponent(`/booking?system=${system}`)}`}
                      className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-ink"
                    >
                      {t("signIn")}
                    </Link>
                  </p>
                </div>
              )}
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <CreditCard className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
                {plans?.demo ? t("demoPay") : t("securePay")}
              </p>
              <StepButtons
                onBack={() => setStep(3)}
                onNext={() => void pay()}
                nextLabel={plans ? t(guest ? "payAccount" : plan === "autobook" ? "payAuto" : "payNotify", { price: formatPrice(plans.plans.find((p) => p.id === plan) ?? { amountCents: 0 }) }) : t("next")}
                nextBusy={working}
                nextDisabled={working || !plans}
              />
            </>
          )}
        </div>

        {/* The summary beside the form, like a receipt that fills in as you go. */}
        {inFlow && draft && (
          <aside aria-label={t("summaryTitle")} className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-line bg-surface p-6">
              <h2 className="text-lg font-bold text-ink">{t("summaryTitle")}</h2>
              <dl className="mt-4 space-y-4 text-[0.9375rem]">
                <SummaryItem label={t("rowService")} value={serviceName} />
                <SummaryItem label={t("rowDates")} value={describeWindow(draft.window, lang)} />
                <SummaryItem label={t("rowName")} value={names || t("nameMissing")} dim={!names} />
                {draft.email && <SummaryItem label={t("rowEmail")} value={draft.email} />}
              </dl>
              <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-line pt-5">
                <span className="text-muted">{t(plan === "autobook" ? "planAutoName" : "planNotifyName")}</span>
                <span className="text-2xl font-bold text-ink tabular">{planPrice ? formatPrice(planPrice) : "…"}</span>
              </div>
            </div>
          </aside>
        )}
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        {toast && (
          <p
            key={toast.id}
            className={`animate-rise pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ${
              toast.tone === "warn" ? "bg-hot text-on-hot" : "bg-ink text-paper"
            }`}
          >
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-0.5 font-medium break-words ${dim ? "text-muted" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-ink">{value}</dd>
    </div>
  );
}

function StepButtons({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  nextBusy,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextBusy?: boolean;
}) {
  const { t } = useI18n();
  const label = nextLabel ?? t("next");
  return (
    // Fixed to the bottom of the screen so the next action is always in reach, like a native app.
    <div data-fixed-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgb(10_10_10/0.18)] lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <div className="mx-auto flex max-w-md gap-3 lg:mx-0 lg:max-w-none">
      <button type="button" className="btn btn-ghost flex-none border-accent px-6 text-accent" onClick={onBack}>
        {t("back")}
      </button>
      <button type="button" className="btn btn-primary group flex-1 lg:flex-none lg:px-8" disabled={nextDisabled} onClick={onNext}>
        {nextBusy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {nextBusy ? t("queuing") : label}
        {!nextBusy && nextLabel === undefined && (
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        )}
      </button>
      </div>
    </div>
  );
}

/** What the person sees once they hold a place: in the queue, or booked. */
function StatusCard({
  system,
  slot,
  people,
  email,
  working,
  confirming,
  onAskCancel,
  onKeep,
  onCancel,
  onAnother,
}: {
  system: SystemId;
  slot: ViewSlot;
  people: number;
  email: string;
  working: boolean;
  confirming: boolean;
  onAskCancel: () => void;
  onKeep: () => void;
  onCancel: () => void;
  onAnother: () => void;
}) {
  const { t, lang } = useI18n();
  const booked = slot.mine?.status === "booked";
  const ahead = Math.max(slot.queued - 1, 0);
  return (
    <div className="text-center">
      <span
        className={`mx-auto grid size-14 place-items-center rounded-full ${booked ? "bg-[#fecc02] text-[#0b2a3c]" : "border-2 border-accent text-accent-line"}`}
        aria-hidden="true"
      >
        {booked ? <Check className="size-7" strokeWidth={3} /> : <Loader2 className="size-6 animate-spin" />}
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-ink">
        {t(booked ? "bookedTitle" : "queueTitle")}
      </h1>
      {booked ? (
        <>
          <p className="mt-2 text-sm text-muted">{t("bookingNumber")}</p>
          <p className="mx-auto mt-2 w-fit rounded-lg bg-surface-2 px-5 py-2.5 font-mono text-lg font-semibold tracking-wider text-ink">
            {slot.mine?.reference ?? t("refPending")}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted" aria-live="polite">
          {ahead === 0 ? t("nobodyAhead") : ahead === 1 ? t("oneAhead") : t("manyAhead", { n: ahead })}
        </p>
      )}

      <dl className="mt-5 divide-y divide-line-2 text-left text-sm">
        <Row label={t("rowService")} value={t(system === "passport" ? "svcPassport" : "svcCoordShort")} />
        <Row label={t("dateLabel")} value={formatDayLong(dayOf(slot.slot), LOCALES[lang])} />
        <Row label={t("timeLabel")} value={clockOf(slot.slot)} />
        <Row label={t("rowApplicants")} value={String(people)} />
        <Row label={t("rowEmail")} value={email} />
      </dl>

      {confirming ? (
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-ghost flex-1 border-accent-line text-accent-line" onClick={onKeep}>
            {t("keepIt")}
          </button>
          <button type="button" className="btn btn-danger-solid flex-1" disabled={working} onClick={onCancel}>
            {working && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {t("yesCancel")}
          </button>
        </div>
      ) : (
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-ghost flex-1 border-accent-line text-accent-line" onClick={onAnother}>
            {t("bookAnother")}
          </button>
          <button type="button" className="btn btn-danger flex-1" onClick={onAskCancel}>
            {t(booked ? "cancelBooking" : "leaveQueue")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Shown after automatic booking is paid but no slot fits yet. */
function WatchingCard({ onAnother }: { onAnother: () => void }) {
  const { t } = useI18n();
  return (
    <div className="text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full border-2 border-accent text-accent-line" aria-hidden="true">
        <Bot className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-ink">{t("watchingTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("watchingBody")}</p>
      <button type="button" className="btn btn-ghost mt-6 w-full border-accent-line text-accent-line" onClick={onAnother}>
        {t("bookAnother")}
      </button>
    </div>
  );
}

/** Shown after the notification plan is paid. */
function AlertCard({ alert, onAnother }: { alert: AlertSubscription; onAnother: () => void }) {
  const { t } = useI18n();
  return (
    <div className="text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fecc02] text-[#0b2a3c]" aria-hidden="true">
        <BellRing className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-ink">{t("alertsTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{alert.telegramUrl ? t("alertsBody") : t("alertsNoBot")}</p>
      {alert.telegramUrl && (
        <a href={alert.telegramUrl} target="_blank" rel="noopener" className="btn btn-primary mt-5 w-full">
          {t("openTelegram")} <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      )}
      <button type="button" className="btn btn-ghost mt-3 w-full border-accent-line text-accent-line" onClick={onAnother}>
        {t("bookAnother")}
      </button>
    </div>
  );
}

export function BookingFallback() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-16" aria-busy="true">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <SlotListSkeleton />
      </div>
    </div>
  );
}
