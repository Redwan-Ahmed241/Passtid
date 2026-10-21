import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start px-4 py-28 sm:px-6">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 font-display text-5xl leading-tight font-medium text-ink">This slot doesn&rsquo;t exist.</h1>
      <p className="mt-4 text-lg text-ink-2">The page you were looking for has moved, or was never offered.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/console" className="btn btn-primary">Open the console</Link>
        <Link href="/" className="btn btn-ghost">Home</Link>
      </div>
    </section>
  );
}
