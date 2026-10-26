"use client";

import { useEffect, useState } from "react";

const SIZE = 200;
const R = SIZE / 2 - 14;
const C = 2 * Math.PI * R;

/** Der große Ergebnis-Moment: Ring füllt sich, Zahl zählt hoch, bei sehr guter Lage kurzes Vibrieren. */
export default function Reveal({
  name,
  match,
  celebrate,
  eyebrow = "Dein Kiez in Berlin",
  caption = "passt zu dir",
  sub,
}: {
  name: string;
  match: number;
  celebrate: boolean;
  eyebrow?: string;
  caption?: string;
  sub?: string;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(match);
      return;
    }
    const start = performance.now();
    const duration = celebrate ? 1100 : 800;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round((1 - Math.pow(1 - t, 3)) * match));
      if (t < 1) frame = requestAnimationFrame(tick);
      else if (celebrate && "vibrate" in navigator) navigator.vibrate([18, 40, 24]);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [celebrate, match]);

  const arc = (Math.max(0, Math.min(100, shown)) / 100) * C;

  return (
    <div className="fade-up text-center">
      <div className="relative mx-auto mt-2" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" className="stroke-tan" strokeWidth={18} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            className="stroke-sun"
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mega text-[64px] tabular-nums leading-none" aria-label={`${match} von 100`}>
            {shown}
          </span>
          <span className="mt-1 text-[14px] font-bold text-muted">{caption}</span>
        </div>
      </div>
      <h1 className="mega mt-5 text-[clamp(1.8rem,7.5vw,2.4rem)] [overflow-wrap:anywhere]">{name}</h1>
      {sub && <p className="mt-1 text-[15px] font-semibold text-muted">{sub}</p>}
      {eyebrow && (
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-extrabold ${
            match >= 64 ? "bg-good/12 text-good" : match >= 45 ? "bg-tan text-ink" : "bg-warn/12 text-warn"
          }`}
        >
          {eyebrow}
        </span>
      )}
    </div>
  );
}
