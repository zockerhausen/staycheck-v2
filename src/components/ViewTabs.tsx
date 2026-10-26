"use client";

import { useState } from "react";

/** Reiter mit gleitendem Knopf (wie bei Revolut). Inhalte kommen fertig vom Server, hier wird nur umgeschaltet. */
export default function ViewTabs({ tabs }: { tabs: { key: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-sand/95 px-4 py-2 backdrop-blur-xl">
        <div className="relative grid rounded-2xl bg-tan p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} role="tablist">
          <span
            aria-hidden
            className="absolute bottom-1 left-1 top-1 rounded-xl bg-sand shadow-soft transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(.3,1.35,.5,1)]"
            style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${active * 100}%)` }}
          />
          {tabs.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => {
                setActive(i);
                try {
                  navigator.vibrate?.(8);
                } catch {
                  /* egal */
                }
              }}
              className={`relative z-[1] py-2.5 text-[14px] font-extrabold transition-colors ${active === i ? "text-ink" : "text-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((t, i) => (
        <div key={t.key} role="tabpanel" hidden={active !== i} className={active === i ? "fade-up mt-4" : ""}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
