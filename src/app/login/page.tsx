import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to see live Swedish embassy slots and manage your booking requests.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton h-72 w-full max-w-md" aria-hidden="true" />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
