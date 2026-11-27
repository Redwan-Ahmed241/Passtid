import { Star } from "lucide-react";

/** A rating out of five, read out as one sentence. */
export function RatingStars({ rating, label }: { rating: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden="true" className={`size-4 ${n <= rating ? "fill-yellow text-busy" : "text-line-strong"}`} />
      ))}
    </span>
  );
}
