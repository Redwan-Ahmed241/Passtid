"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start px-4 py-28 sm:px-6">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 font-display text-5xl leading-tight font-medium text-ink">{t("nfTitle")}</h1>
      <p className="mt-4 text-lg text-ink-2">{t("nfBody")}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/booking" className="btn btn-primary">{t("openConsole")}</Link>
        <Link href="/" className="btn btn-ghost">{t("home")}</Link>
      </div>
    </section>
  );
}
