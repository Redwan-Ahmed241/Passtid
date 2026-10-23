"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { emptyPerson, validateApplicants } from "@/lib/applicants";
import { MAX_PERSONS, SYSTEM_INFO, type Person, type SystemId } from "@/lib/types";

interface Props {
  system: SystemId;
  persons: Person[];
  email: string;
  /** Reveal every error, e.g. after the user tried to book with details missing. */
  showAll: boolean;
  onChange: (next: { persons: Person[]; email: string }) => void;
}

export function ApplicantsEditor({ system, persons, email, showAll, onChange }: Props) {
  const uid = useId();
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const issues = validateApplicants(system, persons, email);
  const issueFor = (field: string) =>
    showAll || touched.has(field) ? issues.find((i) => i.field === field)?.message : undefined;
  const touch = (field: string) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));
  const usesPhone = SYSTEM_INFO[system].identifier === "phone";

  const setPerson = (i: number, patch: Partial<Person>) =>
    onChange({ persons: persons.map((p, j) => (j === i ? { ...p, ...patch } : p)), email });

  return (
    <section aria-labelledby={`${uid}-h`}>
      <div className="flex items-baseline justify-between gap-3">
        <h1 id={`${uid}-h`} className="text-2xl font-semibold text-ink">Your details</h1>
        <span className="font-mono text-xs text-muted tabular">
          {persons.length} {persons.length === 1 ? "person" : "people"}
        </span>
      </div>
      <p className="mt-2 text-[0.8125rem] text-muted">
        {usesPhone
          ? "Migration bookings need each person's name and phone number."
          : "Passport bookings need each person's name and personal (security) number. That is not a phone number."}
      </p>

      <ul className="mt-4 space-y-4">
        {persons.map((p, i) => {
          const f = (name: keyof Person) => `persons.${i}.${name}`;
          return (
            <li key={i} className="rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Person {i + 1}</h3>
                {persons.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange({ persons: persons.filter((_, j) => j !== i), email })}
                    aria-label={`Remove person ${i + 1}`}
                    className="grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-hot-bg hover:text-hot"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="mt-1">
              <div className="grid grid-cols-2 gap-3">
                <Field id={`${uid}-${i}-fn`} label="First name" error={issueFor(f("firstName"))}>
                  <input
                    id={`${uid}-${i}-fn`}
                    className="field"
                    autoComplete={i === 0 ? "given-name" : "off"}
                    value={p.firstName}
                    onChange={(e) => setPerson(i, { firstName: e.target.value })}
                    onBlur={() => touch(f("firstName"))}
                    aria-invalid={!!issueFor(f("firstName"))}
                    aria-describedby={issueFor(f("firstName")) ? `${uid}-${i}-fn-err` : undefined}
                  />
                </Field>
                <Field id={`${uid}-${i}-ln`} label="Last name" error={issueFor(f("lastName"))}>
                  <input
                    id={`${uid}-${i}-ln`}
                    className="field"
                    autoComplete={i === 0 ? "family-name" : "off"}
                    value={p.lastName}
                    onChange={(e) => setPerson(i, { lastName: e.target.value })}
                    onBlur={() => touch(f("lastName"))}
                    aria-invalid={!!issueFor(f("lastName"))}
                    aria-describedby={issueFor(f("lastName")) ? `${uid}-${i}-ln-err` : undefined}
                  />
                </Field>
              </div>

              <div className="mt-3">
                {usesPhone ? (
                  <Field
                    id={`${uid}-${i}-ph`}
                    label="Phone number"
                    error={issueFor(f("phone"))}
                    hint="With country code, e.g. +44 7700 900123."
                  >
                    <input
                      id={`${uid}-${i}-ph`}
                      className="field font-mono tabular"
                      type="tel"
                      inputMode="tel"
                      autoComplete={i === 0 ? "tel" : "off"}
                      value={p.phone}
                      onChange={(e) => setPerson(i, { phone: e.target.value })}
                      onBlur={() => touch(f("phone"))}
                      aria-invalid={!!issueFor(f("phone"))}
                      aria-describedby={issueFor(f("phone")) ? `${uid}-${i}-ph-err` : undefined}
                    />
                  </Field>
                ) : (
                  <Field
                    id={`${uid}-${i}-pn`}
                    label="Personal number"
                    error={issueFor(f("personalNumber"))}
                    hint="Personal or security number. Not your phone number."
                  >
                    <input
                      id={`${uid}-${i}-pn`}
                      className="field font-mono tabular"
                      autoComplete="off"
                      spellCheck={false}
                      value={p.personalNumber}
                      onChange={(e) => setPerson(i, { personalNumber: e.target.value })}
                      onBlur={() => touch(f("personalNumber"))}
                      aria-invalid={!!issueFor(f("personalNumber"))}
                      aria-describedby={issueFor(f("personalNumber")) ? `${uid}-${i}-pn-err` : undefined}
                    />
                  </Field>
                )}
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-accent-line hover:text-ink disabled:opacity-50"
        disabled={persons.length >= MAX_PERSONS}
        onClick={() => onChange({ persons: [...persons, emptyPerson()], email })}
      >
        <Plus className="size-4" aria-hidden="true" /> Add a person
        {persons.length >= MAX_PERSONS && <span className="font-normal text-muted">(max {MAX_PERSONS})</span>}
      </button>

      <div className="mt-4 border-t border-line-2 pt-4">
        <Field
          id={`${uid}-email`}
          label="Contact email"
          error={issueFor("email")}
          hint="One email for the whole submission."
        >
          <input
            id={`${uid}-email`}
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => onChange({ persons, email: e.target.value })}
            onBlur={() => touch("email")}
            aria-invalid={!!issueFor("email")}
            aria-describedby={issueFor("email") ? `${uid}-email-err` : undefined}
          />
        </Field>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-[0.8125rem] text-hot">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
