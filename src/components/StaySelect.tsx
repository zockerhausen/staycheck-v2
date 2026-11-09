"use client";

/** Antippen einer Unterkunft in der Liste: die Karte oben zeigt nur noch sie (siehe StaysPanel / StayMap) */
export default function StaySelect({ n, label, className, children }: { n: number; label: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={() => window.dispatchEvent(new CustomEvent("sc-stay-select", { detail: n }))} className={className}>
      {children}
    </button>
  );
}
