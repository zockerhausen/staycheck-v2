"use client";

import Icon from "@/components/Icon";

/** „Auf Karte“: die Preiskarte springt zu dieser Unterkunft, ein Pin markiert sie (siehe StaysPanel) */
export default function FocusPriceButton({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("sc-stays-focus", { detail: { lat, lon, name } }))}
      aria-label={`${name} auf der Preiskarte zeigen`}
      className="press ml-auto flex shrink-0 items-center gap-1 rounded-full bg-sun px-3 py-1.5 text-[13px] font-extrabold text-white"
    >
      <Icon name="locate" size={13} fill="transparent" /> Auf Karte
    </button>
  );
}
