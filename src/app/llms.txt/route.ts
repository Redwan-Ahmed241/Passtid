import { formatPrice, planFor } from "@/lib/plans";
import { site } from "@/lib/site";
import { SYSTEM_INFO } from "@/lib/types";

/** A plain description of the service for AI assistants and their crawlers. Prices come from the plans. */
export function GET() {
  const text = `# ${site.name}

> An independent service that watches the Swedish embassy's appointment calendar in London and either
> alerts you or books the first slot that fits your dates. It is not the embassy and is not affiliated
> with the Embassy of Sweden or the Swedish Migration Agency.

## What it covers
- Passport and national ID card appointments: slots are watched up to ${SYSTEM_INFO.passport.scanWeeks} weeks ahead.
- Coordination number (samordningsnummer) appointments: watched up to ${SYSTEM_INFO.coordination_number.scanWeeks} weeks ahead.
- Location: London. Times are London time. The site is in English and Swedish.

## Plans
- Alerts: ${formatPrice(planFor("notify"))} a month. A Telegram message when a slot matches; you book it yourself.
- Automatic booking: ${formatPrice(planFor("autobook"))} once. We book the earliest slot that fits, for 1 to 10 people.
- A slot or a successful booking cannot be guaranteed.

## Pages
- English: ${site.url}/
- Swedish: ${site.url}/sv
- Passport questions: ${site.url}/questions and ${site.url}/sv/fragor
- Terms: ${site.url}/terms
- Privacy: ${site.url}/privacy

## Official information
- Opening hours, address, documents and current notices: ${site.embassyUrl}

## Contact
- ${site.contactEmail}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
