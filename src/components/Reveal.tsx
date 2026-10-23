"use client";

import { useEffect, useState } from "react";

/** Der große Ergebnis-Moment: Zahl zählt hoch, Konfetti fliegt. */
export default function Reveal({
  name,
  match,
  celebrate,
}: {
  name: string;
  match: number;
  celebrate: boolean;
}) {
  const [shown, setShown] = useState(celebrate ? 0 : match);

  useEffect(() => {
    if (!celebrate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(match);
      return;
    }

    const start = performance.now();
    const duration = 1100;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * match));
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        if ("vibrate" in navigator) navigator.vibrate([20, 40, 30]);
        import("canvas-confetti").then(({ default: confetti }) =>
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.35 },
            colors: ["#f2662f", "#ffb547", "#ffe2cc", "#2a1a10"],
          }),
        );
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [celebrate, match]);

  return (
    <div className="pop-in">
      <p className="text-sm font-semibold text-peach-ink">Dein Kiez in Berlin</p>
      <h1 className="font-display text-[2.7rem] font-extrabold leading-[1.02] tracking-tight">{name}</h1>
      <p className="font-display text-6xl font-extrabold leading-none text-sun tabular-nums">
        {shown}
        <span className="text-4xl">%</span>
      </p>
      <p className="mt-1 text-sm text-muted">passt zu dir</p>
    </div>
  );
}
