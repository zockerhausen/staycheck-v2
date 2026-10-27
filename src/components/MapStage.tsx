"use client";

import { useEffect, useRef } from "react";

/**
 * Karte (oder Foto) als Bühne: bleibt oben stehen, während die Liste darüber hochgeschoben wird.
 * Je mehr die Liste die Karte verdeckt, desto mehr tritt die Karte zurück (blasser, minimal kleiner).
 */
export default function MapStage({
  id,
  children,
  className = "-mx-4 mt-3",
  overlap = 28,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  /** So weit liegt das Blatt am Anfang schon über der Bühne (px) */
  overlap?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const box = inner.current;
    if (!el || !box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sheet = el.nextElementSibling as HTMLElement | null;
      if (!sheet) return;
      const m = el.getBoundingClientRect();
      const s = sheet.getBoundingClientRect();
      // 0 = Liste liegt nur unten am Rand, 1 = Karte ganz verdeckt
      const p = Math.min(1, Math.max(0, (m.bottom - s.top - overlap) / Math.max(1, m.height - overlap)));
      box.style.opacity = String(1 - p * 0.65);
      box.style.transform = reduce ? "" : `scale(${1 - p * 0.06}) translateY(${-p * 24}px)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [overlap]);

  return (
    <section id={id} ref={ref} className={`sticky top-0 z-0 ${className}`}>
      <div ref={inner} className="origin-top will-change-transform">
        {children}
      </div>
    </section>
  );
}
