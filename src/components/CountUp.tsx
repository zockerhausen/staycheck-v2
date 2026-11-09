"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Zahl zählt beim ersten Sichtbarwerden kurz hoch (z. B. „84“ oder „8,6“). Text ohne Zahl bleibt, wie er ist.
 * Bei „Bewegung reduzieren“ sofort der Endwert.
 */
export default function CountUp({ value, duration = 750 }: { value: string; duration?: number }) {
  const m = /^(\d+)(?:,(\d))?$/.exec(value.trim());
  const target = m ? Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0) : null;
  const decimals = m?.[2] ? 1 : 0;
  const [shown, setShown] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (target === null || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setShown(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
        else setShown(null);
      };
      setShown(0);
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, duration]);

  const text = shown === null || target === null ? value : shown.toFixed(decimals).replace(".", ",");
  return (
    <span ref={ref} className="tabular-nums">
      {text}
    </span>
  );
}
