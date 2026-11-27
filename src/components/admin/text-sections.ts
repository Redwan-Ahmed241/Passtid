/**
 * Turns the internal text paths ("t.signIn", "c.home.heroTitle") into what an administrator
 * recognises: the page or step a text appears on, and a plain name for it.
 */

export interface TextSection {
  id: string;
  group: string;
  title: string;
  about: string;
  /** The page to open to see these texts. */
  href?: string;
  /** Interface strings ("t.<key>") in this section, in the order a visitor meets them. */
  keys?: string;
  /** Page copy: every path starting with one of these. */
  prefixes?: string[];
}

export const SECTIONS: TextSection[] = [
  {
    id: "home-top",
    group: "Home page",
    title: "Top of the page",
    about: "The headline, the text under it and the first buttons visitors see.",
    href: "/",
    prefixes: ["c.home.eyebrow", "c.home.heroTitle", "c.home.heroLead", "c.home.startBooking", "c.home.openBooking", "c.home.points."],
  },
  { id: "home-how", group: "Home page", title: "How it works", about: "The three steps.", href: "/#how", prefixes: ["c.home.howTitle", "c.home.steps."] },
  {
    id: "home-price",
    group: "Home page",
    title: "Prices and plans",
    about: "The wording around the two plans. The prices themselves are set elsewhere.",
    href: "/#price",
    prefixes: ["c.home.priceTitle", "c.home.priceLabel", "c.home.applicantLabel", "c.home.paymentLabel", "c.home.coverageLabel", "c.home.select", "c.home.plans.", "c.home.rulesLink"],
  },
  { id: "home-faq", group: "Home page", title: "Questions and answers", about: "The frequently asked questions.", href: "/#faq", prefixes: ["c.home.faqTitle", "c.faq."] },
  { id: "home-end", group: "Home page", title: "Closing banner", about: "The last invitation at the bottom of the page.", href: "/", prefixes: ["c.home.ctaTitle", "c.home.ctaBody"] },
  {
    id: "menu",
    group: "Every page",
    title: "Menu and footer",
    about: "Links and buttons at the top and bottom of every page, and the disclaimer.",
    href: "/",
    keys: "navHow navPrice navFaq navConsole navRules startBooking bookShort signIn signOut createAccount navSupport navPrivacy navTerms navAdmin home openConsole disclaimer language openMenu closeMenu skipToContent navPassportQuestions",
  },
  {
    id: "general",
    group: "Every page",
    title: "General messages",
    about: "Short messages and buttons used in many places, and the page-not-found screen.",
    keys: "back next close tryAgain oneMoment saving saved notSaved offline somethingWrong cantReach nfTitle nfBody",
  },
  {
    id: "book-service",
    group: "Booking",
    title: "1. Choosing a service",
    about: "The step names and the choice between passport and coordination number.",
    href: "/booking",
    keys: "stepService stepDateTime stepDetails stepConfirm whatNeed svcPassport passportDesc svcCoord svcCoordShort coordDesc rowService",
  },
  {
    id: "book-dates",
    group: "Booking",
    title: "2. Dates and times",
    about: "Where the customer says when they can attend.",
    href: "/booking",
    keys: "chooseDateTime asapTitle useRange dateRangeN removeRangeN from to onlyThisDay timeOfDay morning morningHint afternoon afternoonHint anytime anytimeHint addDateRange noRangeYet errAddRange errAddDate errBadFrom errBadTo errEndBeforeStart anySlotAnytime noDatesYet noRangeYetShort onlyDay fromOnwards until anyTimeOfDay",
  },
  {
    id: "book-details",
    group: "Booking",
    title: "3. Customer details",
    about: "Names, numbers and the contact email, with their error messages.",
    href: "/booking",
    keys: "yourDetails personN removePersonN firstName lastName personalNumber personalHint phoneNumber phoneHint addPerson maxN contactEmail nameMissing errFirstName errFirstNameChars errLastName errLastNameChars errPersonal errPersonalFmt errPhone errPhoneFmt errPersons errEmail errEmailInvalid",
  },
  {
    id: "book-pay",
    group: "Booking",
    title: "4. Review and payment",
    about: "The summary, the choice of plan, consent and payment messages.",
    href: "/booking",
    keys: "reviewBooking summaryTitle rowName rowEmail rowApplicants rowDates rowPlan planTitle planAutoName planAutoDesc planNotifyName planNotifyDesc perMonth gdpr gdprAnd tickBox confirmBooking queuing payAccount payAuto payNotify securePay payConfirming payConfirmed payCancelled payFail loadPlansFail",
  },
  {
    id: "book-slots",
    group: "Booking",
    title: "Open times and the queue",
    about: "The calendar of open appointments. Some of these are read aloud by screen readers.",
    href: "/booking",
    keys: "today tomorrow dateLabel timeLabel timeHeading showMoreDates slotOne slotMany noSlotsTitle noSlotsBody loadSlotsFail loadReqFail noQueue nQueued queuedWord nobodyQueued person people inWindow outsideWindow freeOnSite yoursBooking yoursBooked statusPending statusBooked slotAria queuedAria ariaFree ariaOutside ariaMine",
  },
  {
    id: "book-after",
    group: "Booking",
    title: "After booking",
    about: "Confirmation screens, the queue, and cancelling.",
    href: "/booking",
    keys: "bookedTitle queueTitle watchingTitle watchingBody bookingNumber refPending nobodyAhead oneAhead manyAhead embassyBefore embassyLink embassyAfter bookAnother cancelBooking leaveQueue keepIt yesCancel nBooked nQueuedNotify nCancelled nFailed whyTimeout whyGone bookFail cancelFail",
  },
  {
    id: "book-telegram",
    group: "Booking",
    title: "Telegram updates",
    about: "Connecting Telegram and the optional phone number.",
    keys: "alertsTitle alertsBody alertsNoBot openTelegram telegramAlso telegramScan emailAlways phoneOptional telegramPhoneHint savePhone phoneSaved phoneError",
  },
  {
    id: "signin",
    group: "Accounts",
    title: "Sign in and sign up",
    about: "The sign-in and create-account screens.",
    href: "/login",
    keys: "loginTitle loginLead registerTitle registerLead accountTitle accountEmail email password showPassword hidePassword newHere createAnAccount alreadyReg haveAccount errEnterEmail errEnterPassword errPassword8 errAccountEmail",
  },
  {
    id: "password",
    group: "Accounts",
    title: "Forgotten password",
    about: "Asking for a reset link and choosing a new password.",
    href: "/forgot-password",
    keys: "forgotPassword forgotTitle forgotLead sendResetLink forgotSentTitle forgotSentBody backToSignIn resetTitle resetLead newPassword confirmPassword savePassword errPasswordsMatch errConfirmPassword resetDoneTitle resetDoneBody resetMissingToken requestNewLink",
  },
  { id: "signin-side", group: "Accounts", title: "Side panel", about: "“Why an account”, shown beside the sign-in form.", href: "/login", prefixes: ["c.auth."] },
  {
    id: "feedback",
    group: "Support",
    title: "Customer feedback",
    about: "The rating form on the booking page, and the feedback shown on the home page.",
    href: "/#feedback",
    keys: "fbWallTitle fbWallNote fbStars fbOpen fbTitle fbRating fbMessage fbName fbConsent fbSend fbUpdate fbThanks fbFail fbWaiting fbPublished fbHidden fbErrRating fbErrMessage fbErrName fbSignIn fbOnlyPaid",
  },
  {
    id: "support",
    group: "Support",
    title: "Reporting a problem",
    about: "The report form and the answers customers see.",
    keys: "reportProblem reportTitle reportCategory catBooking catPayment catAccount catOther reportMessage reportSend reportSending reportSent reportFail errReportShort yourReports ticketOpen ticketResolved supportReply spSignIn",
  },
  { id: "privacy", group: "Legal pages", title: "Privacy policy", about: "The whole privacy policy, section by section.", href: "/privacy", prefixes: ["l.privacy."] },
  { id: "terms", group: "Legal pages", title: "Terms and conditions", about: "The whole terms page, section by section.", href: "/terms", prefixes: ["l.terms."] },
  { id: "rules", group: "Booking rules page", title: "Booking rules", about: "This page is only visible if booking rules are switched on.", prefixes: ["c.rules.", "c.timeline."] },
];

const OTHER: TextSection = { id: "other", group: "Other", title: "Other texts", about: "Texts not yet filed under a page." };

/** Every path, filed under a section. Nothing is ever dropped: unknown paths go to “Other texts”. */
export function groupPaths(paths: string[]): { section: TextSection; paths: string[] }[] {
  const left = new Set(paths);
  const take = (list: string[]) => list.filter((p) => left.delete(p));
  const groups = SECTIONS.map((section) => ({
    section,
    paths: [
      ...take((section.keys ?? "").split(" ").map((k) => `t.${k}`)),
      // Page copy stays in the order it is written, which is the order it appears on the page.
      ...take(paths.filter((p) => section.prefixes?.some((x) => (x.endsWith(".") ? p.startsWith(x) : p === x)))),
    ],
  }));
  if (left.size) groups.push({ section: OTHER, paths: [...left] });
  return groups.filter((g) => g.paths.length > 0);
}

const HOME: Record<string, string> = {
  eyebrow: "Small line above the headline",
  heroTitle: "Main headline",
  heroLead: "Text under the headline",
  startBooking: "Button: start booking",
  openBooking: "Button: open booking (signed-in visitors)",
  howTitle: "Section heading",
  priceTitle: "Section heading",
  priceLabel: "Row name: price",
  applicantLabel: "Row name: applicants",
  paymentLabel: "Row name: payment",
  coverageLabel: "Row name: coverage",
  select: "Button: choose a plan",
  rulesLink: "Link to the booking rules",
  faqTitle: "Section heading",
  ctaTitle: "Banner heading",
  ctaBody: "Banner text",
};

const PLAN_FIELD: Record<string, string> = {
  name: "name",
  desc: "description",
  applicants: "number of people",
  payment: "how often you pay",
  coverage: "coverage",
};

/** "matching.2.rule" -> "Matching, item 3, rule" */
function spell(parts: string[]): string {
  const words = parts.map((p) =>
    /^\d+$/.test(p) ? `item ${Number(p) + 1}` : p.replace(/^s(\d)/, "section $1 ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(),
  );
  const text = words.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function interfaceName(key: string, value: string): string {
  if (/^err|Fail$|Error$/.test(key)) return "Error message";
  if (/^aria|Aria$|^skipToContent$|^(open|close)Menu$/.test(key)) return "Read aloud by screen readers";
  if (/^nav/.test(key)) return "Menu link";
  if (/Title$/.test(key)) return "Heading";
  if (/(Body|Lead|Desc)$/.test(key)) return "Description";
  if (/Hint$/.test(key)) return "Helper text";
  return value.length > 40 ? "Message" : "Button or label";
}

/** A plain name for one text. `value` is the original wording, used to tell short labels from messages. */
export function textName(path: string, value: string): string {
  const [root, a, b, c, d] = path.split(".");
  const n = (s: string) => Number(s) + 1;
  if (root === "t") return interfaceName(a, value);
  if (root === "l") {
    if (b === "title") return "Page title";
    if (b === "updated") return "“Last updated” line";
    if (b === "intro") return "Introduction";
    return d === "h" ? `Section ${n(c)}: heading` : `Section ${n(c)}: paragraph ${n(path.split(".")[5])}`;
  }
  if (a === "faq") return c === "q" ? `Question ${n(b)}` : `Answer ${n(b)}`;
  if (a === "auth") return b === "why" ? "Panel heading" : b === "pitch" ? "Panel introduction" : `Point ${n(c)}`;
  if (a === "home") {
    if (b === "points") return `Tick point ${n(c)}`;
    if (b === "steps") return `Step ${n(c)}: ${d === "title" ? "title" : "description"}`;
    if (b === "plans") return `${c === "notify" ? "Alerts" : "Automatic booking"} plan: ${PLAN_FIELD[d] ?? d}`;
    return HOME[b] ?? spell([b]);
  }
  return spell(path.split(".").slice(2));
}

/** Words in braces, such as {price}, that the site fills in. */
export const placeholders = (text: string): string[] => [...new Set(text.match(/\{[a-z]+\}/gi) ?? [])];
