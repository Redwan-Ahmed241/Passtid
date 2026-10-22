import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create an account to watch Swedish embassy slots and book the one you can attend.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton h-96 w-full max-w-md" aria-hidden="true" />}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
