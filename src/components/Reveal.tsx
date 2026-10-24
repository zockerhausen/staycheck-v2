"use client";

import { useEffect, useState } from "react";

const SIZE = 200;
const R = SIZE / 2 - 12;
const C = 2 * Math.PI * R;

/** Der große Ergebnis-Moment: Ring füllt sich, Zahl zählt hoch, Konfetti fliegt. */
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
      else if (celebrate) {
        if ("vibrate" in navigator) navigator.vibrate([20, 40, 30]);
        import("canvas-confetti").then(({ default: confetti }) =>
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.3 },
            colors: ["#f2662f", "#ff8a5c", "#ffd2b8", "#ffffff"],
          }),
        );
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [celebrate, match]);

  const arc = (Math.max(0, Math.min(100, shown)) / 100) * C;

  return (
    <div className="fade-up text-center">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#ffb08f]">{eyebrow}</p>
      <div className="relative mx-auto mt-5" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#1f1f22" strokeWidth={14} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#f2662f"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="mega text-[62px] tabular-nums leading-none" aria-label={`${match} Prozent`}>
            {shown}
          </span>
          <span className="mt-1 text-[13px] font-semibold text-muted">{caption}</span>
        </div>
      </div>
      <h1 className="mega mt-5 text-[clamp(1.9rem,8vw,2.6rem)] [overflow-wrap:anywhere]">{name}</h1>
      {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}
