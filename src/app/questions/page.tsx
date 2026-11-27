import type { Metadata } from "next";
import { QuestionsView } from "@/components/questions-view";
import { baseOpenGraph, questionsAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Swedish passport questions from the UK",
  description: "How to book at the Swedish embassy in London, what to bring, provisional passports, expired passports, ID cards and validity rules, with official sources.",
  alternates: { canonical: "/questions", languages: questionsAlternates },
  openGraph: { ...baseOpenGraph, url: "/questions" },
};

export default function Page() {
  return <QuestionsView lang="en" />;
}
