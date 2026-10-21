"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "../brand";

export interface ChatMessage {
  id: number;
  from: "me" | "bot";
  text: string;
  at: string;
}

interface Props {
  messages: ChatMessage[];
  typing: boolean;
  commands: { cmd: string; hint: string }[];
  onCommand: (cmd: string) => void;
}

export function ChatPanel({ messages, typing, commands, onCommand }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  return (
    <section
      aria-labelledby="chat-h"
      className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-surface-2 ring-1 ring-line">
          <LogoMark className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="chat-h" className="text-sm leading-tight font-semibold text-ink">Booking bot</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-clear" aria-hidden="true" /> Mirrors this console
          </p>
        </div>
      </header>

      <div
        ref={scroller}
        className="flex h-[26rem] flex-col gap-2 overflow-y-auto bg-sunken/60 px-3.5 py-4"
        role="log"
        aria-live="polite"
        aria-label="Bot conversation"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`animate-rise max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.84rem] leading-relaxed whitespace-pre-line shadow-sm ${
              m.from === "me"
                ? "self-end rounded-br-md bg-accent text-on-accent"
                : "self-start rounded-bl-md border border-line-2 bg-surface text-ink"
            }`}
          >
            <span className={m.from === "me" ? "font-mono text-[0.8125rem]" : undefined}>{m.text}</span>
            <span
              className={`mt-1 block text-right font-mono text-[0.625rem] tabular ${
                m.from === "me" ? "text-on-accent/70" : "text-muted"
              }`}
            >
              {m.at}
            </span>
          </div>
        ))}
        {typing && (
          <div className="flex gap-1 self-start rounded-2xl rounded-bl-md border border-line-2 bg-surface px-3.5 py-3" aria-label="Bot is typing">
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line px-3.5 py-3">
        <p className="label-mono mb-2">Send a command</p>
        <div className="flex flex-wrap gap-1.5">
          {commands.map((c) => (
            <button
              key={c.cmd}
              type="button"
              title={c.hint}
              onClick={() => onCommand(c.cmd)}
              className="min-h-9 rounded-lg border border-line bg-surface-2 px-3 font-mono text-[0.8125rem] text-ink-2 transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-accent-ink"
            >
              {c.cmd}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
