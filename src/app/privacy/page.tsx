import type { Metadata } from "next";
import { LegalView } from "@/components/legal-view";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal data Passtid handles to get you a Swedish embassy appointment in London, why, and your rights.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalView id="privacy" />;
}
