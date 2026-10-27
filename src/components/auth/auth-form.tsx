"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { api, ApiRequestError, isMockApi } from "@/lib/api";
import { EMAIL_RE } from "@/lib/applicants";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { announceAuthChange, safeNext, useMe } from "./use-me";

type Mode = "login" | "register";

const COPY = {
  login: {
    title: "loginTitle",
    lead: "loginLead",
    submit: "signIn",
    swap: { text: "newHere", cta: "createAnAccount", href: "/register" },
  },
  register: {
    title: "registerTitle",
    lead: "registerLead",
    submit: "createAccount",
    swap: { text: "alreadyReg", cta: "signIn", href: "/login" },
  },
} as const satisfies Record<Mode, { title: TranslationKey; lead: TranslationKey; submit: TranslationKey; swap: { text: TranslationKey; cta: TranslationKey; href: string } }>;

export function AuthForm({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const uid = useId();
  const copy = COPY[mode];
  const { t } = useI18n();
  const { user } = useMe();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Already signed in: go straight to where they were headed. A full navigation (not router.replace)
  // avoids the router's cached prefetch of a protected page from before sign-in, and makes sure the
  // proxy sees the new session cookie.
  useEffect(() => {
    if (user) window.location.assign(next);
  }, [user, next]);

  const errors: Record<string, string> = {};
  if (mode === "register" && !name.trim()) errors.name = t("errEnterName");
  if (!email.trim()) errors.email = t("errEnterEmail");
  else if (!EMAIL_RE.test(email.trim())) errors.email = t("errEmailInvalid");
  if (!password) errors.password = t("errEnterPassword");
  else if (mode === "register" && password.length < 8) errors.password = t("errPassword8");

  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const shown = (f: string) => (touched[f] ? errors[f] : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setFormError(null);
    if (Object.keys(errors).length) {
      const first = (["name", "email", "password"] as const).find((f) => errors[f]);
      if (first) document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const u =
        mode === "login"
          ? await api.login(email.trim(), password)
          : await api.register(name.trim(), email.trim(), password);
      announceAuthChange(u);
      window.location.assign(next);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t("somethingWrong"));
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-[2.5rem] leading-[1.05] font-medium tracking-[-0.015em] text-ink">{t(copy.title)}</h1>
      <p className="mt-3 text-ink-2">{t(copy.lead)}</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        {mode === "register" && (
          <Field id={`${uid}-name`} label={t("fullName")} error={shown("name")}>
            <input
              id={`${uid}-name`}
              className="field"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => touch("name")}
              aria-invalid={!!shown("name")}
              aria-describedby={shown("name") ? `${uid}-name-err` : undefined}
            />
          </Field>
        )}
        <Field id={`${uid}-email`} label={t("email")} error={shown("email")}>
          <input
            id={`${uid}-email`}
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => touch("email")}
            aria-invalid={!!shown("email")}
            aria-describedby={shown("email") ? `${uid}-email-err` : undefined}
          />
        </Field>
        <Field
          id={`${uid}-password`}
          label={t("password")}
          error={shown("password")}
          
        >
          <div className="relative">
            <input
              id={`${uid}-password`}
              className="field pr-12"
              type={show ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => touch("password")}
              aria-invalid={!!shown("password")}
              aria-describedby={shown("password") ? `${uid}-password-err` : undefined}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? t("hidePassword") : t("showPassword")}
              aria-pressed={show}
              className="absolute top-0 right-0 grid size-11 place-items-center text-muted hover:text-ink"
            >
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </Field>

        {formError && (
          <p role="alert" className="rounded-lg border border-hot-line bg-hot-bg px-3 py-2.5 text-sm text-hot">
            {formError}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary h-12 w-full text-base">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? t("oneMoment") : t(copy.submit)}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        {t(copy.swap.text)}{" "}
        <Link
          href={next === "/booking" ? copy.swap.href : `${copy.swap.href}?next=${encodeURIComponent(next)}`}
          className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-ink"
        >
          {t(copy.swap.cta)}
        </Link>
      </p>

      {isMockApi && (
        <p className="mt-4 flex gap-2.5 rounded-xl border border-line bg-surface-2 p-3.5 text-[0.8125rem] text-muted">
          <Info className="mt-0.5 size-4 flex-none text-accent" aria-hidden="true" />
          <span>{t("demoNote")}</span>
        </p>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-[0.8125rem] text-hot">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
