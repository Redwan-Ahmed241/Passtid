/**
 * All UI copy for the two supported languages, in one plain file.
 * Add a key to `en` first; TypeScript then requires the same key in `sv`.
 */

export const LANGS = ["en", "sv"] as const;
export type Lang = (typeof LANGS)[number];

const en = {
  // shell
  skipToContent: "Skip to content",
  navConsole: "Console",
  navRules: "Booking rules",
  navFaq: "FAQ",
  signIn: "Sign in",
  signOut: "Sign out",
  createAccount: "Create account",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  language: "Language",
  footerProduct: "Product",
  footerReference: "Reference",
  footerConsole: "Booking console",
  footerMigration: "Migration",
  footerChat: "Chat bot",
  footerMatching: "Matching rules",
  footerQueue: "Queue rules",
  footerErrors: "When things go wrong",
  footerTimes: "All times are the embassy’s local time (Europe/London).",
  disclaimer:
    "Passtid is an independent booking assistant. It is not affiliated with, endorsed by or operated by the Embassy of Sweden or the Swedish Migration Agency.",
  builtBy: "Built by",

  // save badge
  saving: "Saving",
  saved: "Saved",
  notSaved: "Not saved",
  offline: "Offline",

  // console wizard
  stepService: "Service",
  stepDateTime: "Date & time",
  stepDetails: "Details",
  stepConfirm: "Confirm",
  advancedWindow: "Advanced: dates the bot may book",
  whatNeed: "What do you need?",
  bookAppt: "Book your embassy appointment",
  chooseDateTime: "Choose date and time",
  reviewBooking: "Review your booking",
  back: "Back",
  next: "Next",
  confirmBooking: "Confirm booking",
  queuing: "Queuing…",

  // window editor
  asapTitle: "As soon as possible",
  asapHelp: "Ignore the dates below and book the very first slot that appears.",
  datesAndTimes: "Dates and times",
  windowIntro: "Pick a date range, then choose when in the day you can attend.",
  fixFields: "Fix the highlighted fields. The bot keeps using your last saved window until then.",
  dateRangeN: "Date range {n}",
  removeRangeN: "Remove date range {n}",
  from: "From",
  to: "To",
  onlyThisDay: "Only this day",
  timeOfDay: "Time of day",
  morning: "Morning",
  morningHint: "Before 12:00",
  afternoon: "Afternoon",
  afternoonHint: "From 12:00",
  anytime: "Anytime",
  anytimeHint: "All day",
  customTimes: "This range uses custom times from an earlier version. Pick an option to replace them.",
  addDateRange: "Add a date range",
  noRangeYet: "No date range yet. Add one to tell the bot which days you can attend.",
  means: "Means",
  errAddRange: "Add at least one date range.",
  errAddDate: "Add a start date, an end date, or both.",
  errBadFrom: "The start date is not a valid date.",
  errBadTo: "The end date is not a valid date.",
  errEndBeforeStart: "The end date is before the start date.",

  // window descriptions
  anySlotAnytime: "any slot, whenever it appears",
  noDatesYet: "no dates yet",
  noRangeYetShort: "no date range yet",
  onlyDay: "{d} only",
  fromOnwards: "from {d} onwards",
  until: "until {d}",
  anyTimeOfDay: "any time of day",
} as const;

export type TranslationKey = keyof typeof en;

const sv: Record<TranslationKey, string> = {
  skipToContent: "Hoppa till innehållet",
  navConsole: "Konsol",
  navRules: "Bokningsregler",
  navFaq: "Vanliga frågor",
  signIn: "Logga in",
  signOut: "Logga ut",
  createAccount: "Skapa konto",
  openMenu: "Öppna menyn",
  closeMenu: "Stäng menyn",
  language: "Språk",
  footerProduct: "Produkt",
  footerReference: "Referens",
  footerConsole: "Bokningskonsol",
  footerMigration: "Migration",
  footerChat: "Chattbot",
  footerMatching: "Matchningsregler",
  footerQueue: "Köregler",
  footerErrors: "När något går fel",
  footerTimes: "Alla tider är ambassadens lokala tid (Europe/London).",
  disclaimer:
    "Passtid är en oberoende bokningsassistent. Den är inte ansluten till, godkänd av eller driven av Sveriges ambassad eller Migrationsverket.",
  builtBy: "Byggd av",

  saving: "Sparar",
  saved: "Sparat",
  notSaved: "Inte sparat",
  offline: "Offline",

  stepService: "Tjänst",
  stepDateTime: "Datum & tid",
  stepDetails: "Uppgifter",
  stepConfirm: "Bekräfta",
  advancedWindow: "Avancerat: datum som boten får boka",
  whatNeed: "Vad behöver du?",
  bookAppt: "Boka din tid på ambassaden",
  chooseDateTime: "Välj datum och tid",
  reviewBooking: "Granska din bokning",
  back: "Tillbaka",
  next: "Nästa",
  confirmBooking: "Bekräfta bokning",
  queuing: "Ställer i kö…",

  asapTitle: "Så snart som möjligt",
  asapHelp: "Ignorera datumen nedan och boka den allra första tiden som dyker upp.",
  datesAndTimes: "Datum och tider",
  windowIntro: "Välj ett datumintervall och sedan vilken del av dagen du kan komma.",
  fixFields: "Rätta de markerade fälten. Boten använder ditt senast sparade fönster tills dess.",
  dateRangeN: "Datumintervall {n}",
  removeRangeN: "Ta bort datumintervall {n}",
  from: "Från",
  to: "Till",
  onlyThisDay: "Bara denna dag",
  timeOfDay: "Tid på dagen",
  morning: "Förmiddag",
  morningHint: "Före 12:00",
  afternoon: "Eftermiddag",
  afternoonHint: "Från 12:00",
  anytime: "När som helst",
  anytimeHint: "Hela dagen",
  customTimes: "Det här intervallet har egna tider från en tidigare version. Välj ett alternativ för att ersätta dem.",
  addDateRange: "Lägg till datumintervall",
  noRangeYet: "Inget datumintervall än. Lägg till ett så vet boten vilka dagar du kan komma.",
  means: "Betyder",
  errAddRange: "Lägg till minst ett datumintervall.",
  errAddDate: "Lägg till ett startdatum, ett slutdatum eller båda.",
  errBadFrom: "Startdatumet är inte ett giltigt datum.",
  errBadTo: "Slutdatumet är inte ett giltigt datum.",
  errEndBeforeStart: "Slutdatumet ligger före startdatumet.",

  anySlotAnytime: "vilken tid som helst, så fort den dyker upp",
  noDatesYet: "inga datum än",
  noRangeYetShort: "inget datumintervall än",
  onlyDay: "endast {d}",
  fromOnwards: "från {d} och framåt",
  until: "till och med {d}",
  anyTimeOfDay: "när som helst på dagen",
};

export const translations: Record<Lang, Record<TranslationKey, string>> = { en, sv };

export function translate(lang: Lang, key: TranslationKey, vars?: Record<string, string | number>): string {
  let text = translations[lang][key];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
