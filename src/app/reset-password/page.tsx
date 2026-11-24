import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your account.",
  alternates: { canonical: "/reset-password" },
  // The link carries a secret token: never index it and never leak it through the referrer.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton h-72 w-full max-w-md" aria-hidden="true" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
