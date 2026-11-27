/**
 * Passport and ID questions for people in the UK, answered in our own words from the pages linked
 * beside each answer. Rules change: when you re-check them, update `CHECKED`.
 * Not editable in Admin on purpose, so an answer and its source cannot drift apart unnoticed.
 */
import type { Lang } from "./i18n/translations";

export const CHECKED = "2026-11-28";

const ABROAD = "https://www.swedenabroad.se/en/about-abroad-for-swedish-citizens/united-kingdom/service-to-swedish-citizens";
export const SOURCES = {
  booking: `${ABROAD}/passports-abroad/book-an-appointment/`,
  adults: `${ABROAD}/passports-abroad/Passports-for-adults/`,
  faq: `${ABROAD}/faq-passports/`,
  provisional: `${ABROAD}/passport-abroad2/`,
  contact: "https://swedenabroad.se/en/embassies/united-kingdom-london/contact",
  police: "https://polisen.se/en/services-and-permits/passport-and-national-id-card/",
  ukBorder: "https://www.gov.uk/uk-border-control/before-you-leave-for-the-uk",
  ukVisa: "https://www.gov.uk/check-uk-visa",
} as const;
export type SourceId = keyof typeof SOURCES;

export interface Question {
  q: string;
  /** One string per paragraph. */
  a: string[];
  sources: SourceId[];
}

const en: Question[] = [
  {
    q: "How do I book a passport appointment?",
    a: ["Through the embassy's online booking system. The embassy says appointments cannot be booked by email, by phone or by visiting. Times can be booked up to six months ahead and are released on an ongoing basis. If you cannot attend, cancel so that someone else can have the time."],
    sources: ["booking", "faq"],
  },
  {
    q: "What do I need to do before my passport or coordination number appointment?",
    a: [
      "For an adult passport or ID card: fill in the form \"Background data for investigation of Swedish citizenship\" before the visit, and bring a valid photo ID. You attend in person for the photo, fingerprints and signature, and pay by card there (American Express and Diners are not accepted). Documents must be originals or certified copies.",
      "You may need more: your other passport if you have dual citizenship, a birth certificate if you have never lived in Sweden, proof of UK residence if you moved before 1998, or a police report for a lost or stolen passport.",
      "What to bring for a coordination number is different. Check with the embassy before your visit.",
    ],
    sources: ["adults", "contact"],
  },
  {
    q: "Why can't I apply online or at an honorary consulate?",
    a: ["Every applicant is photographed and fingerprinted in person. Honorary consulates do not have the camera stations and may not issue ordinary passports or national ID cards. Some can hand out a finished passport if the embassy is told in advance."],
    sources: ["faq"],
  },
  {
    q: "What do I do if my passport has expired?",
    a: ["You can still apply. Bring another valid photo ID, for example a British driving licence. If you have no valid ID, bring someone who has one, together with proof of how you are related, as the embassy describes."],
    sources: ["faq"],
  },
  {
    q: "What is needed for a provisional passport?",
    a: [
      "No appointment. Go to the embassy during its provisional passport hours, weekdays 9 to 11.",
      "Bring proof that you are about to travel to Sweden within two to three days, such as your booking confirmation or e-ticket, plus everything needed for an ordinary passport. The fee is paid when you apply. A valid ordinary passport is cancelled when the provisional one is issued, and a provisional passport cannot be used as ID.",
    ],
    sources: ["provisional", "faq", "contact"],
  },
  {
    q: "Can I get a provisional passport at the embassy for a return trip?",
    a: ["No. The embassy describes its provisional passport as valid for a single journey, and its questions page says it is for one-way travel to Sweden. Plan how you will get back before you travel."],
    sources: ["provisional", "faq"],
  },
  {
    q: "Can I enter the UK on a Swedish provisional passport?",
    a: [
      "Do not assume so. The embassy's understanding is that UK border control currently accepts it only from travellers who do not need an Electronic Travel Authorisation (ETA). A provisional passport issued by a Swedish embassy has no biometrics, so it cannot be used where an ETA is required; one issued by the Swedish police does.",
      "Check the current UK rules for your own situation before you travel.",
    ],
    sources: ["faq", "ukVisa"],
  },
  {
    q: "How long must my passport be valid to enter Sweden and the UK?",
    a: ["Sweden: the embassy says a Swedish citizen can travel to Sweden up to and including the passport's last day of validity. UK: the government says an EU citizen's identity document should be valid for the whole of your stay. Airlines may ask for more, so check with yours."],
    sources: ["faq", "ukBorder"],
  },
  {
    q: "Can I apply in Sweden if I live abroad?",
    a: ["Yes, at any police passport office, and it costs less than at the embassy. Book a time with the police first (their booking page is in Swedish) and bring the citizenship background form used by applicants living abroad. You can ask to collect the passport at the embassy in London if you say so when you apply. More documents may be requested."],
    sources: ["faq", "police"],
  },
  {
    q: "Can another Swedish embassy issue a passport and send it to London?",
    a: ["Yes, it can be sent for collection in the UK. You need a valid passport to travel to that other country in the first place. To collect in Belfast, Edinburgh or Gibraltar, contact the London embassy first."],
    sources: ["faq", "booking"],
  },
  {
    q: "Can I travel between Sweden and the UK on a national ID card?",
    a: [
      "Into the UK, an EU national ID card is accepted only in certain cases, such as settled or pre-settled status under the EU Settlement Scheme, a family permit under that scheme, a Frontier Worker permit, or a pending application you can prove. Otherwise you need a passport, and possibly a visa or an ETA.",
      "Leaving Sweden for a country outside the EU, the embassy says Swedish law requires a valid passport. For UK to Sweden, it says the national ID card can be used if you hold a UK residence permit. Taking your passport is the safe choice.",
    ],
    sources: ["ukBorder", "faq"],
  },
  {
    q: "How do I contact the embassy?",
    a: [
      "Embassy of Sweden, 11 Montagu Place, London W1H 2AL. Telephone 020 7917 6400, weekdays 9 to 11.",
      "Passports, appointments and collection: ambassaden.london-pass@gov.se. Other enquiries: embassy.london@gov.se. Hours and closed days change, so check before you go.",
    ],
    sources: ["contact"],
  },
];

const sv: Question[] = [
  {
    q: "Hur bokar jag en passtid?",
    a: ["I ambassadens bokningssystem på nätet. Enligt ambassaden går det inte att boka via e-post, telefon eller besök. Tider kan bokas upp till sex månader framåt och släpps löpande. Om du inte kan komma, avboka så att någon annan får tiden."],
    sources: ["booking", "faq"],
  },
  {
    q: "Vad behöver jag göra innan min pass- eller samordningsnummertid på ambassaden?",
    a: [
      "För pass eller ID-kort för vuxna: fyll i blanketten om underlag för utredning av svenskt medborgarskap före besöket och ta med en giltig legitimation med foto. Du måste komma personligen för foto, fingeravtryck och namnteckning, och betalar med kort på plats (inte American Express eller Diners). Handlingar ska vara i original eller vidimerade kopior.",
      "Du kan behöva mer: ditt andra pass om du har dubbelt medborgarskap, födelsebevis om du aldrig har bott i Sverige, bevis om bosättning i Storbritannien om du flyttade dit före 1998, eller en polisanmälan för ett förlorat eller stulet pass.",
      "För samordningsnummer gäller andra handlingar. Kontrollera med ambassaden före besöket.",
    ],
    sources: ["adults", "contact"],
  },
  {
    q: "Varför kan jag inte ansöka om pass på nätet eller hos ett honorärkonsulat?",
    a: ["Alla sökande fotograferas och lämnar fingeravtryck på plats. Honorärkonsulaten har inte fotostationer och får inte utfärda vanliga pass eller nationella ID-kort. Vissa kan lämna ut ett färdigt pass om ambassaden meddelas i förväg."],
    sources: ["faq"],
  },
  {
    q: "Vad gör jag om mitt pass har gått ut?",
    a: ["Du kan ansöka ändå. Ta med en annan giltig fotolegitimation, till exempel ett brittiskt körkort. Har du ingen giltig legitimation, ta med någon som har det samt det underlag om hur ni är släkt som ambassaden beskriver."],
    sources: ["faq"],
  },
  {
    q: "Vad behövs för att få ett provisoriskt pass?",
    a: [
      "Ingen tidsbokning. Gå till ambassaden under tiderna för provisoriskt pass, vardagar klockan 9–11.",
      "Ta med bevis på att du ska resa till Sverige inom två till tre dagar, till exempel bokningsbekräftelse eller e-biljett, och allt som krävs för ett vanligt pass. Avgiften betalas vid ansökan. Ett giltigt vanligt pass spärras när det provisoriska utfärdas, och ett provisoriskt pass kan inte användas som legitimation.",
    ],
    sources: ["provisional", "faq", "contact"],
  },
  {
    q: "Kan jag få provisoriskt pass på ambassaden för en tur-och-returresa?",
    a: ["Nej. Ambassaden beskriver sitt provisoriska pass som giltigt för en enkel resa, och enligt frågesidan är det till för enkelresor till Sverige. Planera hur du tar dig tillbaka innan du reser."],
    sources: ["provisional", "faq"],
  },
  {
    q: "Kan jag resa in i Storbritannien på ett svenskt provisoriskt pass?",
    a: [
      "Utgå inte från det. Enligt ambassadens uppfattning godtar den brittiska gränskontrollen det för närvarande bara från resenärer som inte behöver ett elektroniskt resetillstånd (ETA). Ett provisoriskt pass från en svensk ambassad saknar biometri och kan därför inte användas när ETA krävs; ett som utfärdats av svensk polis har biometri.",
      "Kontrollera de aktuella brittiska reglerna för din situation innan du reser.",
    ],
    sources: ["faq", "ukVisa"],
  },
  {
    q: "Hur länge måste mitt pass vara giltigt för inresa i Sverige och Storbritannien?",
    a: ["Sverige: enligt ambassaden kan en svensk medborgare resa till Sverige till och med passets sista giltighetsdag. Storbritannien: enligt brittiska staten ska en EU-medborgares ID-handling vara giltig under hela vistelsen. Flygbolag kan kräva mer, så fråga ditt flygbolag."],
    sources: ["faq", "ukBorder"],
  },
  {
    q: "Kan jag söka pass i Sverige som utlandsboende?",
    a: ["Ja, hos vilken passexpedition som helst hos polisen, och det kostar mindre än på ambassaden. Boka tid hos polisen först och ta med medborgarskapsblanketten för utlandsboende. Du kan hämta passet på ambassaden i London om du säger det när du ansöker. Fler handlingar kan begäras."],
    sources: ["faq", "police"],
  },
  {
    q: "Kan en annan svensk ambassad utfärda ett pass som skickas till London?",
    a: ["Ja, det kan skickas för avhämtning i Storbritannien. Du behöver ett giltigt pass för att kunna resa till det andra landet. Vill du hämta i Belfast, Edinburgh eller Gibraltar, kontakta först ambassaden i London."],
    sources: ["faq", "booking"],
  },
  {
    q: "Kan jag resa mellan Sverige och Storbritannien på nationellt ID-kort?",
    a: [
      "Till Storbritannien godtas ett nationellt ID-kort från ett EU-land bara i vissa fall, till exempel med settled eller pre-settled status enligt EU Settlement Scheme, familjetillstånd enligt samma ordning, Frontier Worker-tillstånd eller en pågående ansökan som du kan styrka. Annars behöver du pass, och eventuellt visum eller ETA.",
      "Vid utresa från Sverige till ett land utanför EU kräver svensk lag enligt ambassaden ett giltigt pass. Från Storbritannien till Sverige kan ID-kortet enligt ambassaden användas om du har uppehållstillstånd i Storbritannien. Att ta med passet är det säkra valet.",
    ],
    sources: ["ukBorder", "faq"],
  },
  {
    q: "Hur kontaktar jag ambassaden?",
    a: [
      "Sveriges ambassad, 11 Montagu Place, London W1H 2AL. Telefon 020 7917 6400, vardagar klockan 9–11.",
      "Pass, tidsbokning och avhämtning: ambassaden.london-pass@gov.se. Övriga frågor: embassy.london@gov.se. Öppettider och stängda dagar ändras, så kontrollera före besöket.",
    ],
    sources: ["contact"],
  },
];

export const questions: Record<Lang, Question[]> = { en, sv };
