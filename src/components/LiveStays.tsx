"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { isDarkNow } from "@/components/ThemeSwitch";
import { partnerOn, stayMapUrl } from "@/lib/partner";

/**
 * Alle freien Zimmer mit Preis auf einer Karte (Partner Stay22), mit denselben Reisedaten wie die Liste.
 * Lädt erst nach Antippen: vorher gehen keine Daten an Dritte (keine fremden Cookies ohne Klick).
 */
export default function LiveStays({
  lat,
  lon,
  place,
  campaign,
  checkin,
  checkout,
  adults,
  maxPrice,
}: {
  lat: number;
  lon: number;
  place: string;
  campaign: string;
  checkin: string;
  checkout: string;
  adults: number;
  maxPrice?: number | null;
}) {
  const [open, setOpen] = useState(false);
  if (!partnerOn) return null;
  const src = open ? stayMapUrl({ lat, lon, campaign, checkin, checkout, adults, maxPrice, dark: isDarkNow() }) : null;
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[1.35rem] font-extrabold tracking-[-0.03em]">Freie Zimmer auf der Karte</h2>
        <span className="rounded-full bg-tan px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-muted">Anzeige</span>
      </div>
      <p className="mt-1 text-[14px] font-semibold text-muted">
        Alle Unterkünfte rund um {place} mit echtem Preis für deine Daten{maxPrice ? `, bis ${maxPrice} € pro Nacht` : ""}.
      </p>
      {src ? (
        <iframe
          key={src}
          src={src}
          title={`Freie Zimmer mit Preisen rund um ${place}`}
          className="mt-3 h-[460px] w-full rounded-3xl border-0 bg-paper"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press card mt-3 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl text-sun-soft"
        >
          <Icon name="map" size={30} />
          <span className="text-[15px] font-extrabold">Preise auf der Karte zeigen</span>
          <span className="text-[12px] font-semibold text-muted">Lädt die Karte unseres Partners Stay22</span>
        </button>
      )}
      <p className="mt-2 text-[12px] font-semibold leading-snug text-muted">
        Preise von Booking.com über unseren Partner Stay22. Buchst du darüber, bekommt StayCheck eine kleine Provision, dein Preis ändert sich nicht.
      </p>
    </section>
  );
}
