"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { isDarkNow } from "@/components/ThemeSwitch";
import { maxPriceFor, partnerOn, stayMapUrl } from "@/lib/partner";

/**
 * Echte Unterkünfte mit Preisen und Gästebewertungen (über unseren Partner Stay22).
 * Lädt erst nach Antippen: vorher gehen keine Daten an Dritte (keine fremden Cookies ohne Klick).
 */
export default function LiveStays({ lat, lon, place, campaign, band }: { lat: number; lon: number; place: string; campaign: string; band?: number | null }) {
  const [src, setSrc] = useState<string | null>(null);
  if (!partnerOn) return null;
  return (
    <section className="glass-card mt-5 overflow-hidden rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em]">Freie Zimmer mit Preis</h2>
          <p className="mt-1 text-[14px] font-semibold text-muted">
            Echte Unterkünfte rund um {place} mit aktuellen Preisen und Gästebewertungen{band && band < 3 ? ", passend zu deinem Budget" : ""}.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-tan px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-muted">Anzeige</span>
      </div>
      {src ? (
        <iframe
          src={src}
          title={`Unterkünfte mit Preisen rund um ${place}`}
          className="mt-3 h-[560px] w-full rounded-[20px] border-0 bg-paper"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        />
      ) : (
        <button
          type="button"
          onClick={() => setSrc(stayMapUrl({ lat, lon, campaign, maxPrice: maxPriceFor(band), dark: isDarkNow() }))}
          className="press shadow-primary mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-sun py-3.5 text-[15px] font-extrabold text-white active:bg-sun-dark"
        >
          <Icon name="hotel" size={18} /> Preise und Bewertungen laden
        </button>
      )}
      <p className="mt-2.5 text-[12px] font-semibold leading-snug text-muted">
        Partner-Angebot über Stay22 (Booking.com, Agoda, Expedia u. a.). Buchst du darüber, bekommt StayCheck eine kleine Provision, für dich ändert
        sich der Preis nicht. {src ? "" : "Erst beim Laden gehen Daten an Stay22."}
      </p>
    </section>
  );
}
