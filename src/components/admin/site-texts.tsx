"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { applyTexts } from "@/lib/i18n";
import { builtinTexts } from "@/lib/i18n/overrides";
import { LANGS, type Lang } from "@/lib/i18n/translations";
import type { TextOverrides } from "@/lib/types";
import { groupPaths, placeholders, textName, type TextSection } from "./text-sections";

const LANG_NAME: Record<Lang, string> = { en: "English", sv: "Swedish" };
const MAX_RESULTS = 60;
const message = (err: unknown) => (err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");

/** Unsaved edits per language: a string to set, null to restore the original text. */
type Edits = Record<Lang, Record<string, string | null>>;
const NO_EDITS: Edits = { en: {}, sv: {} };

export function SiteTexts() {
  const [lang, setLang] = useState<Lang>("en");
  const [sectionId, setSectionId] = useState("home-top");
  const [query, setQuery] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [saved, setSaved] = useState<TextOverrides | null>(null);
  const [edits, setEdits] = useState<Edits>(NO_EDITS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    api.texts().then(setSaved, (err: unknown) => setError(message(err)));
  }, []);

  const originals = useMemo(() => ({ en: builtinTexts("en"), sv: builtinTexts("sv") }), []);
  const groups = useMemo(() => groupPaths(Object.keys(originals.en)), [originals]);
  const unsaved = Object.keys(edits.en).length + Object.keys(edits.sv).length;

  // Closing the tab or reloading would throw the edits away, so the browser asks first.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  if (!saved) {
    return error ? (
      <p role="alert" className="text-sm text-hot">{error}</p>
    ) : (
      <Loader2 className="size-5 animate-spin text-muted" aria-label="Loading texts" />
    );
  }

  const textFor = (l: Lang, path: string) => {
    const edit = edits[l][path];
    return edit !== undefined ? (edit ?? originals[l][path]) : (saved[l][path] ?? originals[l][path]);
  };
  const isChanged = (path: string) => (edits[lang][path] !== undefined ? edits[lang][path] !== null : saved[lang][path] !== undefined);
  const missingIn = (l: Lang, path: string, value: string) => placeholders(originals[l][path]).filter((p) => !value.includes(p));

  const broken = LANGS.flatMap((l) =>
    Object.entries(edits[l])
      .filter(([path, value]) => value !== null && value !== "" && missingIn(l, path, value).length > 0)
      .map(([path]) => ({ lang: l, path })),
  );

  const edit = (path: string, value: string) => {
    setJustSaved(false);
    setEdits((all) => {
      const next = { ...all[lang] };
      // Typing the text back to what is stored is not a change.
      if (value === (saved[lang][path] ?? originals[lang][path])) delete next[path];
      else next[path] = value === originals[lang][path] ? null : value;
      return { ...all, [lang]: next };
    });
  };

  const restore = (path: string) => {
    setJustSaved(false);
    setEdits((all) => {
      const next = { ...all[lang] };
      if (saved[lang][path] === undefined) delete next[path];
      else next[path] = null;
      return { ...all, [lang]: next };
    });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.adminSetTexts(edits);
      setSaved(next);
      applyTexts(next);
      setEdits(NO_EDITS);
      setJustSaved(true);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const show = (id: string) => {
    setSectionId(id);
    setQuery("");
    setOnlyChanged(false);
  };

  const q = query.trim().toLowerCase();
  const listing = q !== "" || onlyChanged;
  const matches = (section: TextSection, path: string) =>
    (!onlyChanged || isChanged(path)) &&
    (!q || [textFor(lang, path), originals.en[path], textName(path, originals.en[path]), section.title].some((s) => s.toLowerCase().includes(q)));

  let shown = groups.filter((g) => g.section.id === sectionId);
  let total = 0;
  if (listing) {
    let room = MAX_RESULTS;
    shown = [];
    for (const g of groups) {
      const found = g.paths.filter((p) => matches(g.section, p));
      total += found.length;
      if (found.length && room > 0) shown.push({ section: g.section, paths: found.slice(0, room) });
      room -= found.length;
    }
  }

  const groupNames = [...new Set(groups.map((g) => g.section.group))];
  const changedCount = (paths: string[]) => paths.filter(isChanged).length;

  return (
    <div>
      <p className="max-w-[65ch] text-ink-2">
        Pick a part of the website, change the wording in its box, then press Save. Visitors see the new wording the next time they open
        the page.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-2" id="text-lang">Language</span>
          <div role="group" aria-labelledby="text-lang" className="inline-flex h-11 rounded-[0.625rem] border border-line bg-surface p-0.5">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className="rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:text-ink aria-pressed:bg-accent aria-pressed:text-white"
              >
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
        </div>
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Find a text by its words</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            name="text-search"
            autoComplete="off"
            className="field w-full pl-9"
            placeholder="Find a text, for example “Sign in”…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="size-4 accent-accent" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
          Only texts I have changed
        </label>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {/* Narrow screens pick the part from a list; wide screens keep the whole map in view. */}
        <label className="block lg:hidden">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Part of the website</span>
          <select className="field w-full" value={sectionId} onChange={(e) => show(e.target.value)}>
            {groupNames.map((name) => (
              <optgroup key={name} label={name}>
                {groups
                  .filter((g) => g.section.group === name)
                  .map((g) => (
                    <option key={g.section.id} value={g.section.id}>
                      {g.section.title}
                      {changedCount(g.paths) ? ` (${changedCount(g.paths)} changed)` : ""}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <nav aria-label="Parts of the website" className="hidden self-start lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1 lg:pb-4">
          {groupNames.map((name) => (
            <div key={name} className="mb-4">
              <p className="px-3 pb-1 text-sm font-bold text-ink">{name}</p>
              <ul>
                {groups
                  .filter((g) => g.section.group === name)
                  .map((g) => {
                    const current = !listing && g.section.id === sectionId;
                    const changed = changedCount(g.paths);
                    return (
                      <li key={g.section.id}>
                        <button
                          type="button"
                          aria-current={current ? "true" : undefined}
                          onClick={() => show(g.section.id)}
                          className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-[0.9375rem] text-ink-2 transition-colors hover:bg-sunken aria-current:bg-accent-soft aria-current:font-semibold aria-current:text-accent-ink"
                        >
                          {g.section.title}
                          {changed > 0 && (
                            <span className="rounded-full bg-yellow px-2 text-xs font-semibold text-navy tabular">
                              {changed}
                              <span className="sr-only"> changed</span>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-6 min-w-0 lg:mt-0">
          {listing && (
            <p role="status" className="mb-4 text-sm text-muted">
              {total === 0
                ? onlyChanged && !q
                  ? "You have not changed any text in this language."
                  : "No text matches. Try a shorter word."
                : `${total} text${total === 1 ? "" : "s"} found${total > MAX_RESULTS ? `, showing the first ${MAX_RESULTS}` : ""}.`}
            </p>
          )}

          {shown.map(({ section, paths }) => (
            <section key={section.id} aria-labelledby={`sec-${section.id}`} className="mb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id={`sec-${section.id}`} className="text-xl font-bold text-ink">
                  {listing ? `${section.group}: ${section.title}` : section.title}
                </h2>
                {section.href && (
                  <a href={section.href} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-ink">
                    See it on the website <ExternalLink className="size-4" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </div>
              {!listing && <p className="max-w-[65ch] text-sm text-muted">{section.about}</p>}

              <ul className="mt-3 divide-y divide-line-2 rounded-xl border border-line bg-surface px-4 sm:px-5">
                {paths.map((path) => {
                  const value = edits[lang][path] === "" ? "" : textFor(lang, path);
                  const name = textName(path, originals.en[path]);
                  const id = `text-${path}`;
                  const fills = placeholders(originals[lang][path]);
                  const missing = value ? missingIn(lang, path, value) : [];
                  const pending = edits[lang][path] !== undefined;
                  return (
                    <li key={`${lang}:${path}`} className="py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <label htmlFor={id} className="text-sm font-semibold text-ink">
                          {name}
                          {pending ? (
                            <span className="ml-2 font-normal text-busy">Not saved yet</span>
                          ) : (
                            isChanged(path) && <span className="ml-2 font-normal text-clear">Changed by you</span>
                          )}
                        </label>
                        {isChanged(path) && (
                          <button type="button" className="min-h-11 text-sm font-semibold text-accent hover:text-accent-ink sm:min-h-0" onClick={() => restore(path)}>
                            Put the original back<span className="sr-only"> for {name}</span>
                          </button>
                        )}
                      </div>
                      <textarea
                        id={id}
                        name={path}
                        autoComplete="off"
                        lang={lang}
                        rows={Math.min(8, Math.max(1, Math.ceil(value.length / 70)))}
                        className="field mt-1.5 field-sizing-content w-full resize-y text-base"
                        maxLength={5000}
                        value={value}
                        aria-invalid={missing.length > 0}
                        aria-describedby={`${id}-help`}
                        onChange={(e) => edit(path, e.target.value)}
                      />
                      <div id={`${id}-help`} className="text-sm text-muted">
                        {lang !== "en" && <p className="mt-1 break-words">In English: {originals.en[path]}</p>}
                        {value === "" && <p className="mt-1">Left empty, the original wording is used.</p>}
                        {missing.length > 0 ? (
                          <p role="alert" className="mt-1 text-hot">
                            Put {missing.join(" and ")} back into the text. The website replaces it with real information.
                          </p>
                        ) : (
                          fills.length > 0 && <p className="mt-1">Keep {fills.join(" and ")} as written. The website fills it in.</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {(unsaved > 0 || justSaved || error) && (
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line-strong bg-surface px-4 py-3 shadow-md">
              <p role="status" className="mr-auto text-sm font-semibold text-ink">
                {unsaved > 0 ? `${unsaved} change${unsaved === 1 ? "" : "s"} not saved yet` : justSaved ? "Saved. Your changes are live." : ""}
              </p>
              {error && <p role="alert" className="w-full text-sm text-hot">{error}</p>}
              {broken.length > 0 && (
                <p className="w-full text-sm text-hot">
                  {broken.length === 1 ? "One text is" : `${broken.length} texts are`} missing a word in braces.{" "}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => {
                      setLang(broken[0].lang);
                      const home = groups.find((g) => g.paths.includes(broken[0].path));
                      if (home) show(home.section.id);
                      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`text-${broken[0].path}`)?.focus()));
                    }}
                  >
                    Show me
                  </button>
                </p>
              )}
              {unsaved > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost h-11 min-h-11 text-sm"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("Throw away the changes you have not saved?")) setEdits(NO_EDITS);
                    }}
                  >
                    Discard
                  </button>
                  <button type="button" className="btn btn-primary h-11 min-h-11 text-sm" disabled={busy || broken.length > 0} onClick={() => void save()}>
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
