import type { Metadata } from "next";
import { LegalView } from "@/components/legal-view";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms for using Passtid to watch for and book Swedish embassy appointments in London.",
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms" },
};

export default function TermsPage() {
  return <LegalView id="terms" />;
}
