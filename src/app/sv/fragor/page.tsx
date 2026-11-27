import type { Metadata } from "next";
import { QuestionsView } from "@/components/questions-view";
import { baseOpenGraph, questionsAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Frågor om svenskt pass i Storbritannien · Passtid" },
  description: "Boka tid på ambassaden i London, vad du ska ta med, provisoriskt pass, utgånget pass, ID-kort och giltighetstid, med officiella källor.",
  alternates: { canonical: "/sv/fragor", languages: questionsAlternates },
  openGraph: { ...baseOpenGraph, locale: "sv_SE", url: "/sv/fragor" },
};

export default function Page() {
  return <QuestionsView lang="sv" />;
}
