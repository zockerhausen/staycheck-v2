"use client";

import Icon from "@/components/Icon";

/** „Preise hier“: zeigt die Preis-Karte genau um diese Unterkunft, mit deinem Budget (siehe StaysPanel) */
export default function FocusPriceButton({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("sc-stays-focus", { detail: { lat, lon, name } }))}
      aria-label={`Freie Zimmer mit Preis rund um ${name} zeigen`}
      className="press ml-auto flex shrink-0 items-center gap-1 rounded-full bg-sun px-3 py-1.5 text-[13px] font-extrabold text-white"
    >
      <Icon name="map" size={13} fill="transparent" /> Preise hier
    </button>
  );
}
