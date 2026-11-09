"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { markReplace } from "@/components/BackButton";

/**
 * Reiter mit gleitendem Knopf (wie bei Revolut). Inhalte kommen fertig vom Server, hier wird nur umgeschaltet.
 * Der gewählte Reiter steht in der Adresse (?ansicht=…), ohne neuen Schritt im Verlauf: Wer zurückkommt, landet im selben Reiter.
 */
export default function ViewTabs({ tabs }: { tabs: { key: string; label: string; content: React.ReactNode }[] }) {
  const params = useSearchParams();
  const fromUrl = tabs.findIndex((t) => t.key === params.get("ansicht"));
  const [active, setActive] = useState(fromUrl >= 0 ? fromUrl : 0);
  function choose(i: number) {
    setActive(i);
    const u = new URL(window.location.href);
    if (i === 0) u.searchParams.delete("ansicht");
    else u.searchParams.set("ansicht", tabs[i].key);
    markReplace();
    window.history.replaceState(window.history.state, "", u);
  }
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mt-[22px] bg-sand/90 px-4 py-2.5 backdrop-blur-xl">
        <div className="relative grid rounded-full bg-peach p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} role="tablist">
          <span
            aria-hidden
            className="shadow-primary absolute bottom-1 left-1 top-1 rounded-full bg-sun transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
            style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${active * 100}%)` }}
          />
          {tabs.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => {
                choose(i);
                try {
                  navigator.vibrate?.(8);
                } catch {
                  /* egal */
                }
              }}
              className={`relative z-[1] min-h-[40px] text-[14.5px] font-extrabold transition-colors duration-200 ${active === i ? "text-white" : "text-sun-soft"}`}
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
