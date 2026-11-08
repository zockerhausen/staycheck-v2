"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { isDarkNow } from "@/components/ThemeSwitch";
import { maxPriceFor, partnerOn, stayMapUrl } from "@/lib/partner";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const fmt = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "short" });

/**
 * Echte Unterkünfte mit Preisen und Gästebewertungen (über unseren Partner Stay22), eingebettet im StayCheck-Look:
 * Datum, Gäste und Karte/Liste wählt man bei uns, Stay22 zeigt nur die Ergebnisse.
 * Lädt erst nach Antippen: vorher gehen keine Daten an Dritte (keine fremden Cookies ohne Klick).
 */
export default function LiveStays({ lat, lon, place, campaign, band }: { lat: number; lon: number; place: string; campaign: string; band?: number | null }) {
  const today = new Date();
  const [checkin, setCheckin] = useState(iso(addDays(today, 14)));
  const [nights, setNights] = useState(2);
  const [adults, setAdults] = useState(1);
  const [view, setView] = useState<"map" | "listview">("map");
  const [open, setOpen] = useState(false);
  if (!partnerOn) return null;

  const checkout = iso(addDays(new Date(`${checkin}T12:00:00`), nights));
  const src = open ? stayMapUrl({ lat, lon, campaign, view, checkin, checkout, adults, maxPrice: maxPriceFor(band), dark: isDarkNow() }) : null;

  const chip = (on: boolean) => `press rounded-full px-3.5 py-2 text-[14px] font-bold transition-colors ${on ? "bg-sun text-white" : "bg-peach text-sun-soft"}`;

  return (
    <section className="glass-card mt-5 overflow-hidden rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em]">Freie Zimmer mit Preis</h2>
          <p className="mt-1 text-[14px] font-semibold text-muted">
            Echte Unterkünfte rund um {place}{band && band < 3 ? ", passend zu deinem Budget" : ""}.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-tan px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-muted">Anzeige</span>
      </div>

      {/* Reisedaten: bei uns gewählt, im StayCheck-Look */}
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-end gap-2">
        <label className="block min-w-0">
          <span className="text-[12px] font-bold text-muted">Anreise</span>
          <input
            type="date"
            value={checkin}
            min={iso(today)}
            onChange={(e) => e.target.value && setCheckin(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-[15px] font-bold"
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-bold text-muted">Nächte</span>
          <select value={nights} onChange={(e) => setNights(Number(e.target.value))} className="mt-1 rounded-2xl border border-line bg-paper px-3 py-2.5 text-[15px] font-bold">
            {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-bold text-muted">Gäste</span>
          <select value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="mt-1 rounded-2xl border border-line bg-paper px-3 py-2.5 text-[15px] font-bold">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[13px] font-semibold text-muted">
        {fmt(checkin)} bis {fmt(checkout)} · {nights} {nights === 1 ? "Nacht" : "Nächte"} · {adults} {adults === 1 ? "Person" : "Personen"}
      </p>

      {src ? (
        <>
          <div className="mt-3 flex gap-2" role="group" aria-label="Ansicht">
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} className={chip(view === "map")}>
              Karte mit Preisen
            </button>
            <button type="button" aria-pressed={view === "listview"} onClick={() => setView("listview")} className={chip(view === "listview")}>
              Liste
            </button>
          </div>
          <iframe
            key={src}
            src={src}
            title={`Unterkünfte mit Preisen rund um ${place}`}
            className="mt-3 h-[520px] w-full rounded-[20px] border-0 bg-paper"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press shadow-primary mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-sun py-3.5 text-[15px] font-extrabold text-white active:bg-sun-dark"
        >
          <Icon name="hotel" size={18} /> Preise und Bewertungen laden
        </button>
      )}
      <p className="mt-2.5 text-[12px] font-semibold leading-snug text-muted">
        Partner-Angebot über Stay22 (Booking.com, Agoda, Expedia u. a.). Buchst du darüber, bekommt StayCheck eine kleine Provision, dein Preis ändert
        sich nicht.{src ? "" : " Erst beim Laden gehen Daten an Stay22."}
      </p>
    </section>
  );
}
