/**
 * Privacy policy and terms and conditions, in both languages. Plain data: `en` defines the shape,
 * `sv` must match it. {email} is replaced with the support address.
 */
import type { Lang } from "./translations";

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; p: string[] }[];
}

export type LegalId = "privacy" | "terms";

const en: Record<LegalId, LegalDoc> = {
  privacy: {
    title: "Privacy policy",
    updated: "Last updated 27 October 2026",
    intro:
      "Passtid helps you get a Swedish embassy appointment in London. This policy explains what personal data we handle to do that, why, and what your rights are.",
    sections: [
      {
        h: "Who we are",
        p: ["Passtid is an independent service. It is not part of, and is not operated by, the Embassy of Sweden or the Swedish Migration Agency. For anything in this policy, contact us at {email}."],
      },
      {
        h: "What we collect",
        p: [
          "For each person on a booking: first and last name, and a personal (security) number for passports and ID cards or a phone number for migration. For the booking as a whole: a contact email, the dates and times you can attend, and the status of your booking.",
          "For your account: your name, your email and a password, which we store only as a one-way hash.",
          "We do not see or store your card number. Payments are handled by Stripe, and we only receive confirmation that a payment was made.",
        ],
      },
      {
        h: "Why we use it",
        p: [
          "To carry out the service you ask for: watching the calendar, alerting you or making the booking, and telling you the result. This is the basis for almost everything we do with your data.",
          "To keep the service secure and to keep records we must keep by law, such as payment records.",
          "If you enter details for other people, such as family members, you confirm that you are allowed to do so on their behalf.",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "The embassy's booking website, only the details needed to make your booking. Stripe, to take payment. Telegram, if you choose Telegram alerts. Our hosting and database providers, who process data on our behalf.",
          "We do not sell your data and we do not use it for advertising.",
        ],
      },
      {
        h: "How long we keep it",
        p: ["We keep booking details only as long as needed to complete and follow up your booking. Account details are kept until you ask us to delete the account. Payment records are kept for as long as the law requires."],
      },
      {
        h: "Cookies and storage",
        p: ["We use one cookie to keep you signed in and remember your language choice on your device. We do not use advertising or tracking cookies."],
      },
      {
        h: "Your rights",
        p: [
          "You can ask to see, correct, delete or move your data, and to restrict or object to how we use it. Write to {email} and we will answer within one month.",
          "If you are not happy with how we handle your data, you can complain to your data protection authority, for example IMY in Sweden or the ICO in the United Kingdom.",
        ],
      },
      {
        h: "Changes",
        p: ["If we change this policy in a way that matters, we will update the date above and tell you when you next use the service."],
      },
    ],
  },
  terms: {
    title: "Terms and conditions",
    updated: "Last updated 27 October 2026",
    intro: "By creating an account or paying for a plan you agree to these terms. Please read them together with our privacy policy.",
    sections: [
      {
        h: "The service",
        p: [
          "Passtid watches the Swedish embassy's public appointment calendar in London. Depending on the plan you choose, we either send you an alert when a slot matches your dates, or book the earliest matching slot for you.",
          "Passtid is independent. We are not the embassy and are not affiliated with the Embassy of Sweden or the Swedish Migration Agency.",
        ],
      },
      {
        h: "No guarantee of a slot",
        p: ["Appointments depend on what the embassy releases and on its website working. We cannot guarantee that a slot will appear, or that a booking will succeed. We will do what we reasonably can to act quickly on slots that fit your dates."],
      },
      {
        h: "Your responsibilities",
        p: [
          "Give accurate details. A booking made with wrong names or numbers may be refused at the embassy.",
          "Only enter details for other people if you are allowed to act for them.",
          "You are responsible for attending the appointment and for bringing the documents the embassy requires.",
        ],
      },
      {
        h: "Plans and payment",
        p: [
          "The price of each plan is shown before you pay, and is charged once through Stripe. A plan covers the service you chose for the people and dates you entered.",
          "If we cannot provide the service you paid for, contact us at {email} and we will find a fair solution, including a refund where appropriate. This does not affect your legal rights as a consumer.",
        ],
      },
      {
        h: "Cancelling",
        p: ["You can cancel a queued or booked appointment from your booking page at any time. If you no longer need the appointment, please cancel it so that someone else can use the slot."],
      },
      {
        h: "Acceptable use",
        p: ["Do not misuse the service, try to disrupt it, or use it to book appointments for people who have not asked for them. We may suspend accounts that do."],
      },
      {
        h: "Liability",
        p: ["We are not liable for missed appointments, changes made by the embassy, or its website being unavailable. Nothing in these terms limits liability that cannot be limited by law."],
      },
      {
        h: "Changes and contact",
        p: ["We may update these terms and will change the date above when we do. Questions? Write to {email}."],
      },
    ],
  },
};

const sv: Record<LegalId, LegalDoc> = {
  privacy: {
    title: "Integritetspolicy",
    updated: "Senast uppdaterad 27 oktober 2026",
    intro:
      "Passtid hjälper dig att få en tid på Sveriges ambassad i London. Här förklarar vi vilka personuppgifter vi hanterar för det, varför, och vilka rättigheter du har.",
    sections: [
      {
        h: "Vilka vi är",
        p: ["Passtid är en oberoende tjänst. Vi är inte en del av, och drivs inte av, Sveriges ambassad eller Migrationsverket. Kontakta oss på {email} i alla frågor om den här policyn."],
      },
      {
        h: "Vad vi samlar in",
        p: [
          "För varje person i en bokning: förnamn och efternamn samt personnummer för pass och ID-kort eller telefonnummer för migration. För bokningen som helhet: en kontaktmejl, vilka datum och tider du kan komma och bokningens status.",
          "För ditt konto: ditt namn, din e-postadress och ett lösenord som vi bara lagrar som en envägs-hash.",
          "Vi ser eller lagrar aldrig ditt kortnummer. Betalningar hanteras av Stripe, och vi får bara en bekräftelse på att en betalning gjorts.",
        ],
      },
      {
        h: "Varför vi använder dem",
        p: [
          "För att utföra tjänsten du ber om: bevaka kalendern, larma dig eller göra bokningen och berätta resultatet. Det är grunden för nästan allt vi gör med dina uppgifter.",
          "För att hålla tjänsten säker och för att spara sådant vi enligt lag måste spara, till exempel betalningsunderlag.",
          "Om du anger uppgifter för andra, till exempel familjemedlemmar, intygar du att du får göra det å deras vägnar.",
        ],
      },
      {
        h: "Vilka vi delar dem med",
        p: [
          "Ambassadens bokningssida, bara de uppgifter som behövs för att göra din bokning. Stripe, för att ta emot betalning. Telegram, om du väljer Telegram-larm. Våra leverantörer av drift och databas, som behandlar uppgifter för vår räkning.",
          "Vi säljer inte dina uppgifter och använder dem inte för reklam.",
        ],
      },
      {
        h: "Hur länge vi sparar dem",
        p: ["Vi sparar bokningsuppgifter bara så länge som behövs för att slutföra och följa upp din bokning. Kontouppgifter sparas tills du ber oss radera kontot. Betalningsunderlag sparas så länge lagen kräver."],
      },
      {
        h: "Cookies och lagring",
        p: ["Vi använder en cookie för att hålla dig inloggad och sparar ditt språkval på din enhet. Vi använder inga reklam- eller spårningscookies."],
      },
      {
        h: "Dina rättigheter",
        p: [
          "Du kan be att få se, rätta, radera eller flytta dina uppgifter, och begränsa eller invända mot hur vi använder dem. Skriv till {email} så svarar vi inom en månad.",
          "Om du inte är nöjd med hur vi hanterar dina uppgifter kan du klaga hos din tillsynsmyndighet, till exempel IMY i Sverige eller ICO i Storbritannien.",
        ],
      },
      {
        h: "Ändringar",
        p: ["Om vi ändrar policyn på ett sätt som spelar roll uppdaterar vi datumet ovan och säger till nästa gång du använder tjänsten."],
      },
    ],
  },
  terms: {
    title: "Villkor",
    updated: "Senast uppdaterad 27 oktober 2026",
    intro: "Genom att skapa ett konto eller betala för en tjänst godkänner du de här villkoren. Läs dem tillsammans med vår integritetspolicy.",
    sections: [
      {
        h: "Tjänsten",
        p: [
          "Passtid bevakar Sveriges ambassads öppna tidskalender i London. Beroende på tjänsten du väljer skickar vi antingen ett larm när en tid matchar dina datum, eller bokar den tidigaste matchande tiden åt dig.",
          "Passtid är oberoende. Vi är inte ambassaden och har ingen koppling till Sveriges ambassad eller Migrationsverket.",
        ],
      },
      {
        h: "Ingen garanti för en tid",
        p: ["Tider beror på vad ambassaden släpper och på att dess webbplats fungerar. Vi kan inte garantera att en tid dyker upp eller att en bokning lyckas. Vi gör det vi rimligen kan för att snabbt agera på tider som passar dina datum."],
      },
      {
        h: "Ditt ansvar",
        p: [
          "Lämna korrekta uppgifter. En bokning med fel namn eller nummer kan nekas på ambassaden.",
          "Ange bara uppgifter för andra om du får agera för dem.",
          "Du ansvarar för att komma till tiden och ta med de handlingar ambassaden kräver.",
        ],
      },
      {
        h: "Tjänster och betalning",
        p: [
          "Priset för varje tjänst visas innan du betalar och dras en gång via Stripe. Tjänsten gäller det du valt för de personer och datum du angett.",
          "Om vi inte kan leverera tjänsten du betalat för, kontakta oss på {email} så hittar vi en rimlig lösning, inklusive återbetalning när det är lämpligt. Det påverkar inte dina lagstadgade rättigheter som konsument.",
        ],
      },
      {
        h: "Avbokning",
        p: ["Du kan avboka en köad eller bokad tid från din bokningssida när som helst. Om du inte längre behöver tiden, avboka den så att någon annan kan använda den."],
      },
      {
        h: "Tillåten användning",
        p: ["Missbruka inte tjänsten, försök inte störa den och använd den inte för att boka tider åt personer som inte bett om det. Vi kan stänga av konton som gör det."],
      },
      {
        h: "Ansvarsbegränsning",
        p: ["Vi ansvarar inte för missade tider, ändringar som ambassaden gör eller att dess webbplats inte fungerar. Inget i de här villkoren begränsar ansvar som inte får begränsas enligt lag."],
      },
      {
        h: "Ändringar och kontakt",
        p: ["Vi kan uppdatera villkoren och ändrar då datumet ovan. Frågor? Skriv till {email}."],
      },
    ],
  },
};

export const legal: Record<Lang, Record<LegalId, LegalDoc>> = { en, sv };
