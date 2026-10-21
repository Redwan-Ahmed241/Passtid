export const site = {
  name: "Tidlucka",
  tagline: "Book a slot you can actually attend",
  description:
    "Tidlucka watches Swedish embassy appointment slots in London for passports, national ID cards and coordination numbers. Set the days and hours you can attend, see how many people are already queued for each slot, and book the quiet one.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  locale: "en_GB",
  disclaimer:
    "Tidlucka is an independent booking assistant. It is not affiliated with, endorsed by or operated by the Embassy of Sweden or the Swedish Migration Agency.",
} as const;
