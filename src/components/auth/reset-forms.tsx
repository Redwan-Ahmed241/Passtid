"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { EMAIL_RE } from "@/lib/applicants";
import { useI18n } from "@/lib/i18n";

const errorBox = "rounded-lg border border-hot-line bg-hot-bg px-3 py-2.5 text-sm text-hot";

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[0.8125rem] text-hot">
      {text}
    </p>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        className="field pr-12"
        maxLength={200}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
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
  );
}

/** Step 1: ask for a reset link. The answer is the same whether or not the email has an account. */
export function ForgotForm() {
  const uid = useId();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const error = !email.trim() ? t("errEnterEmail") : !EMAIL_RE.test(email.trim()) ? t("errEmailInvalid") : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError(null);
    if (error) {
      document.getElementById(`${uid}-email`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t("somethingWrong"));
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="w-full max-w-md" role="status">
        <MailCheck className="size-9 text-clear" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[2.5rem] leading-[1.05] font-medium tracking-[-0.015em] text-ink">{t("forgotSentTitle")}</h1>
        <p className="mt-3 text-ink-2">{t("forgotSentBody")}</p>
        <Link href="/login" className="btn btn-primary mt-8 h-12 w-full text-base">
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-[2.5rem] leading-[1.05] font-medium tracking-[-0.015em] text-ink">{t("forgotTitle")}</h1>
      <p className="mt-3 text-ink-2">{t("forgotLead")}</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <div>
          <label htmlFor={`${uid}-email`} className="mb-1.5 block text-sm font-medium text-ink-2">
            {t("email")}
          </label>
          <input
            id={`${uid}-email`}
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={200}
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !!error}
            aria-describedby={touched && error ? `${uid}-email-err` : undefined}
          />
          <FieldError id={`${uid}-email-err`} text={touched ? error : undefined} />
        </div>
        {formError && (
          <p role="alert" className={errorBox}>
            {formError}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn btn-primary h-12 w-full text-base">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? t("oneMoment") : t("sendResetLink")}
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-ink">
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}

/** Step 2: choose a new password with the token from the email link. */
export function ResetForm() {
  const uid = useId();
  const { t } = useI18n();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="w-full max-w-md" role="status">
        <CheckCircle2 className="size-9 text-clear" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[2.5rem] leading-[1.05] font-medium tracking-[-0.015em] text-ink">{t("resetDoneTitle")}</h1>
        <p className="mt-3 text-ink-2">{t("resetDoneBody")}</p>
        <Link href="/login" className="btn btn-primary mt-8 h-12 w-full text-base">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-medium tracking-[-0.015em] text-ink">{t("resetTitle")}</h1>
        <p role="alert" className={`mt-6 ${errorBox}`}>
          {t("resetMissingToken")}
        </p>
        <Link href="/forgot-password" className="btn btn-primary mt-6 h-12 w-full text-base">
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  const passwordError = !password ? t("errEnterPassword") : password.length < 8 ? t("errPassword8") : undefined;
  const confirmError = !confirm ? t("errConfirmPassword") : confirm !== password ? t("errPasswordsMatch") : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setFormError(null);
    if (passwordError || confirmError) {
      document.getElementById(`${uid}-${passwordError ? "password" : "confirm"}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t("somethingWrong"));
    }
    setBusy(false);
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-[2.5rem] leading-[1.05] font-medium tracking-[-0.015em] text-ink">{t("resetTitle")}</h1>
      <p className="mt-3 text-ink-2">{t("resetLead")}</p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <div>
          <label htmlFor={`${uid}-password`} className="mb-1.5 block text-sm font-medium text-ink-2">
            {t("newPassword")}
          </label>
          <PasswordInput
            id={`${uid}-password`}
            value={password}
            onChange={setPassword}
            invalid={touched && !!passwordError}
            describedBy={touched && passwordError ? `${uid}-password-err` : undefined}
          />
          <FieldError id={`${uid}-password-err`} text={touched ? passwordError : undefined} />
        </div>
        <div>
          <label htmlFor={`${uid}-confirm`} className="mb-1.5 block text-sm font-medium text-ink-2">
            {t("confirmPassword")}
          </label>
          <PasswordInput
            id={`${uid}-confirm`}
            value={confirm}
            onChange={setConfirm}
            invalid={touched && !!confirmError}
            describedBy={touched && confirmError ? `${uid}-confirm-err` : undefined}
          />
          <FieldError id={`${uid}-confirm-err`} text={touched ? confirmError : undefined} />
        </div>
        {formError && (
          <div role="alert" className={errorBox}>
            {formError}{" "}
            <Link href="/forgot-password" className="font-semibold underline">
              {t("requestNewLink")}
            </Link>
          </div>
        )}
        <button type="submit" disabled={busy} className="btn btn-primary h-12 w-full text-base">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? t("oneMoment") : t("savePassword")}
        </button>
      </form>
    </div>
  );
}
