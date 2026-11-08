import type { Metadata } from "next";
import { baseOpenGraph } from "@/lib/seo";
import { LegalView } from "@/components/legal-view";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms for using Passtid to watch for and book Swedish embassy appointments in London, covering the alert and automatic booking plans, payment and refunds.",
  alternates: { canonical: "/terms" },
  openGraph: { ...baseOpenGraph, url: "/terms" },
};

export default function TermsPage() {
  return <LegalView id="terms" />;
}
