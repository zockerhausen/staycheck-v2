"use client";

import { useEffect, useRef } from "react";

/**
 * Bild, das sich bei einem Ladefehler einfach ausblendet (darunter liegt dann die Farbfläche).
 * Nachgeladene Bilder blenden weich ein statt aufzuploppen; wichtige (eager) erscheinen sofort.
 */
export default function SafeImg({ src, className, eager = false }: { src: string; className?: string; eager?: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Schon aus dem Speicher geladen, bevor React bereit war: gleich zeigen
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) img.classList.add("is-loaded");
  }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`${className ?? ""} ${eager ? "" : "img-fade"}`}
      onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
      onError={(e) => {
        e.currentTarget.style.display = "none";
        const box = e.currentTarget.parentElement;
        box?.querySelectorAll<HTMLElement>("[data-credit]").forEach((el) => (el.style.display = "none"));
        box?.classList.add("img-failed");
      }}
    />
  );
}
