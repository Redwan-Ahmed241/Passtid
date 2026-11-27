"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useHomeHref } from "@/lib/i18n";

/** A link to the home page in the visitor's language. */
export function HomeLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const homeHref = useHomeHref();
  return <Link {...props} href={homeHref()} />;
}
