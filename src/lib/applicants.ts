import type { TranslationKey } from "./i18n/translations";
import { MAX_PERSONS, SYSTEM_INFO, type BookingRequest, type Person, type SystemId } from "./types";

/**
 * Applicant rules per service:
 *  - passport / ID : first name, last name, personal (security) number
 *  - coordination_number : first name, last name, phone number
 *  - both          : one contact email for the whole submission
 * A personal number is not a phone number, so the two are separate fields.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PERSONAL_NUMBER_RE = /^[A-Za-z0-9][A-Za-z0-9\- ]{4,23}$/;
const PHONE_RE = /^\+?[0-9][0-9 ()\-]{6,22}$/;
const NAME_RE = /^[\p{L}][\p{L}\p{M}'’ .\-]{0,59}$/u;

export interface ApplicantIssue {
  /** e.g. "persons.0.firstName", "persons.1.phone", "email" */
  field: string;
  /** English text for API errors; the UI translates `key` instead. */
  message: string;
  key?: TranslationKey;
  vars?: Record<string, string | number>;
}

export function emptyPerson(): Person {
  return { firstName: "", lastName: "", personalNumber: "", phone: "" };
}

export function validatePerson(system: SystemId, p: Person, i: number): ApplicantIssue[] {
  const issues: ApplicantIssue[] = [];
  const add = (name: keyof Person, message: string, key: TranslationKey) =>
    issues.push({ field: `persons.${i}.${name}`, message, key });

  if (!p.firstName.trim()) add("firstName", "Enter a first name.", "errFirstName");
  else if (!NAME_RE.test(p.firstName.trim())) add("firstName", "The first name has characters we can't accept.", "errFirstNameChars");

  if (!p.lastName.trim()) add("lastName", "Enter a last name.", "errLastName");
  else if (!NAME_RE.test(p.lastName.trim())) add("lastName", "The last name has characters we can't accept.", "errLastNameChars");

  if (SYSTEM_INFO[system].identifier === "personalNumber") {
    if (!p.personalNumber.trim()) add("personalNumber", "Enter a personal (security) number.", "errPersonal");
    else if (!PERSONAL_NUMBER_RE.test(p.personalNumber.trim())) {
      add("personalNumber", "A personal number is 5 to 24 letters, digits or hyphens.", "errPersonalFmt");
    }
  } else if (!p.phone.trim()) {
    add("phone", "Enter a phone number.", "errPhone");
  } else if (!PHONE_RE.test(p.phone.trim())) {
    add("phone", "Enter a phone number such as +44 7700 900123.", "errPhoneFmt");
  }
  return issues;
}

export function validateApplicants(system: SystemId, persons: Person[], email: string): ApplicantIssue[] {
  const issues: ApplicantIssue[] = [];
  if (persons.length < 1 || persons.length > MAX_PERSONS) {
    issues.push({ field: "persons", message: `Choose between 1 and ${MAX_PERSONS} people.`, key: "errPersons", vars: { n: MAX_PERSONS } });
  }
  persons.forEach((p, i) => issues.push(...validatePerson(system, p, i)));
  if (!email.trim()) issues.push({ field: "email", message: "Enter a contact email.", key: "errEmail" });
  else if (!EMAIL_RE.test(email.trim())) issues.push({ field: "email", message: "Enter a valid email address.", key: "errEmailInvalid" });
  return issues;
}

export function isComplete(system: SystemId, r: Pick<BookingRequest, "persons" | "email">): boolean {
  return validateApplicants(system, r.persons, r.email).length === 0;
}
