"use client";

import { useEffect, useState } from "react";

type Mode = "auto" | "light" | "dark";
const OPTIONS: { key: Mode; label: string }[] = [
  { key: "auto", label: "Wie Handy" },
  { key: "light", label: "Hell" },
  { key: "dark", label: "Dunkel" },
];

/** Darstellung wählen: wie am Handy eingestellt, hell oder dunkel. Wirkt sofort, ohne Neuladen. */
export default function ThemeSwitch() {
  const [mode, setMode] = useState<Mode>("auto");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setMode(t === "light" || t === "dark" ? t : "auto");
  }, []);

  function choose(m: Mode) {
    setMode(m);
    const root = document.documentElement;
    if (m === "auto") {
      delete root.dataset.theme;
      document.cookie = "sc_theme=; Max-Age=0; Path=/; SameSite=Lax; Secure";
    } else {
      root.dataset.theme = m;
      document.cookie = `sc_theme=${m}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
    }
    window.dispatchEvent(new Event("sc-theme"));
    try {
      navigator.vibrate?.(8);
    } catch {
      /* egal */
    }
  }

  const i = OPTIONS.findIndex((o) => o.key === mode);
  return (
    <div className="relative grid grid-cols-3 rounded-2xl bg-tan p-1" role="radiogroup" aria-label="Darstellung">
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-sand shadow-soft transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(.3,1.35,.5,1)]"
        style={{ transform: `translateX(${i * 100}%)` }}
      />
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={mode === o.key}
          onClick={() => choose(o.key)}
          className={`relative z-10 py-2.5 text-sm font-extrabold transition-colors ${mode === o.key ? "text-ink" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Ist gerade die dunkle Darstellung aktiv? (gewählt oder vom Handy) */
export function isDarkNow() {
  const t = document.documentElement.dataset.theme;
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
