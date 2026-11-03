import type { Metadata } from "next";
import { baseOpenGraph } from "@/lib/seo";
import { LegalView } from "@/components/legal-view";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal data Passtid handles to get you a Swedish embassy appointment in London, why we need it, how long we keep it, and the rights you have over it.",
  alternates: { canonical: "/privacy" },
  openGraph: { ...baseOpenGraph, url: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalView id="privacy" />;
}
