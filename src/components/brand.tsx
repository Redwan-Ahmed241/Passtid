import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

/** Mark: a Swedish-blue passport with a yellow cross, two navy binding pins and a clock face. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect x="4" y="3" width="24" height="26" rx="4" fill="#006aa7" />
      <rect x="2.5" y="8" width="3.5" height="4" rx="1.75" fill="#0b2a3c" />
      <rect x="2.5" y="20" width="3.5" height="4" rx="1.75" fill="#0b2a3c" />
      <rect x="11" y="3" width="3.6" height="26" fill="#fecc02" />
      <rect x="4" y="14.2" width="24" height="3.6" fill="#fecc02" />
      <circle cx="12.8" cy="16" r="4.4" fill="#ffffff" />
      <path d="M12.8 13.4V16l1.9 1.2" fill="none" stroke="#0b2a3c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The Passtid logo. Header and footer both use it; /logo.svg is the same artwork without the white box. */
export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex min-h-11 shrink-0 items-center rounded-md" aria-label={`${site.name} home`}>
      <Image
        src="/logo.svg"
        alt={site.name}
        width={641}
        height={168}
        priority
        unoptimized
        className="h-7 w-auto max-w-none shrink-0 sm:h-8"
      />
    </Link>
  );
}