"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { isDarkNow } from "@/components/ThemeSwitch";
import { partnerOn, stayMapUrl } from "@/lib/partner";
import { MAX_OPTIONS } from "@/lib/trip";

type Poi = { lat: number; lng: number; name: string; desc?: string };
type Chip = { key: string; label: string; href: string; active: boolean };

const fmt = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
const CONSENT_KEY = "sc-stay22-ok";

/**
 * Unterkünfte an einem Ort, aus einem Guss:
 * eine Suchzeile (Daten, Personen, Budget → Fenster von unten), Umschalter Liste | Karte, schlanke Filter.
 * Die Karte mit echten Preisen (Partner Stay22) lädt erst nach Zustimmung und belegt immer denselben Platz (kein Springen).
 */
export default function StaysPanel({
  checkin,
  checkout,
  nights,
  adults,
  max,
  count,
  chips,
  map,
  children,
}: {
  checkin: string;
  checkout: string;
  nights: number;
  adults: number;
  max: number | null;
  count: number;
  chips: Chip[];
  map: { lat: number; lon: number; place: string; campaign: string; pois: Poi[] };
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"liste" | "karte">("liste");
  const [sheet, setSheet] = useState(false);
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "1");
    } catch {
      /* ohne Speicher: jedes Mal fragen */
    }
  }, []);

  function save(next: { an: string; n: number; p: number; max: number }) {
    const q = new URLSearchParams(params.toString());
    q.set("an", next.an);
    q.set("n", String(next.n));
    q.set("p", String(next.p));
    q.set("max", String(next.max));
    q.delete("typ");
    setSheet(false);
    start(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  }

  function allowMap() {
    setConsent(true);
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* egal */
    }
  }

  const src =
    partnerOn && view === "karte" && consent
      ? stayMapUrl({ lat: map.lat, lon: map.lon, campaign: map.campaign, checkin, checkout, adults, maxPrice: max, dark: isDarkNow(), pois: map.pois })
      : null;

  return (
    <div>
      {/* Suchzeile */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className="press glass-card flex w-full items-center gap-3 rounded-full py-2 pl-2 pr-4 text-left"
        aria-label="Reisedaten und Budget ändern"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sun text-white">
          <Icon name="calendar" size={20} fill="transparent" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[15.5px] font-extrabold">
            {fmt(checkin)} – {fmt(checkout)} · {adults} {adults === 1 ? "Person" : "Personen"}
          </b>
          <span className="block truncate text-[13px] font-semibold text-muted">{max ? `Budget bis ${max} € pro Nacht` : "Jedes Budget"}</span>
        </span>
        <span className="shrink-0 text-[13px] font-extrabold text-sun-soft">{pending ? "…" : "Ändern"}</span>
      </button>

      {/* Liste | Karte */}
      {partnerOn && (
        <div className="mt-3 flex items-center gap-3">
          <div className="relative grid flex-1 grid-cols-2 rounded-full bg-peach p-1" role="tablist" aria-label="Ansicht">
            <span
              aria-hidden
              className="shadow-primary absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-sun transition-transform duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
              style={{ transform: view === "karte" ? "translateX(100%)" : "translateX(0)" }}
            />
            {(["liste", "karte"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`relative z-10 flex items-center justify-center gap-1.5 py-2.5 text-[14px] font-extrabold transition-colors ${view === v ? "text-white" : "text-sun-soft"}`}
              >
                <Icon name={v === "liste" ? "hotel" : "map"} size={16} fill="transparent" />
                {v === "liste" ? `Nach Lage (${count})` : "Mit Preisen"}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "liste" || !partnerOn ? (
        <div className="fade-up">
          {chips.length > 1 && (
            <nav className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Unterkunftsart">
              {chips.map((c) => (
                <Link
                  key={c.key}
                  href={c.href}
                  scroll={false}
                  aria-current={c.active ? "true" : undefined}
                  className={`press shrink-0 rounded-full px-3.5 py-2 text-[13.5px] font-extrabold transition-colors ${
                    c.active ? "bg-ink text-sand" : "bg-tan text-muted"
                  }`}
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          )}
          {children}
        </div>
      ) : (
        <div className="fade-up mt-3">
          <div className="relative h-[min(68dvh,560px)] overflow-hidden rounded-3xl bg-paper">
            {src ? (
              <iframe
                key={src}
                src={src}
                title={`Unterkünfte mit Preisen rund um ${map.place}`}
                className="absolute inset-0 h-full w-full border-0"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-peach text-sun-soft">
                  <Icon name="map" size={30} />
                </span>
                <b className="text-[18px] font-extrabold">Echte Preise auf der Karte</b>
                <p className="text-[14px] font-semibold text-muted">
                  Freie Zimmer mit Preis pro Nacht von Booking.com, dazu unsere Lage-Werte. Die Karte kommt von unserem Partner Stay22, dabei wird deine
                  IP-Adresse übertragen.
                </p>
                <button type="button" onClick={allowMap} className="press shadow-primary mt-1 rounded-full bg-sun px-6 py-3 text-[15px] font-extrabold text-white">
                  Karte laden
                </button>
              </div>
            )}
          </div>
          <p className="mt-2 flex items-start gap-2 text-[12.5px] font-semibold leading-snug text-muted">
            <span className="mt-0.5 shrink-0 rounded-full bg-tan px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide">Anzeige</span>
            <span>
              Weiße Pins: Preis pro Nacht bei Booking.com. Violette Pins: unser Lage-Wert. Buchst du über die Karte, bekommt StayCheck eine kleine
              Provision, dein Preis ändert sich nicht.
            </span>
          </p>
        </div>
      )}

      {sheet && (
        <TripSheet
          initial={{ an: checkin, n: nights, p: adults, max: max ?? 0 }}
          onClose={() => setSheet(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

/** Fenster von unten: Anreise, Nächte, Personen, Budget pro Nacht */
function TripSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: { an: string; n: number; p: number; max: number };
  onClose: () => void;
  onSave: (v: { an: string; n: number; p: number; max: number }) => void;
}) {
  const [an, setAn] = useState(initial.an);
  const [n, setN] = useState(initial.n);
  const [p, setP] = useState(initial.p);
  const [max, setMax] = useState(initial.max);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const today = new Date().toISOString().slice(0, 10);

  const stepper = (label: string, value: number, set: (v: number) => void, min: number, maxV: number, unit: (v: number) => string) => (
    <div className="flex items-center justify-between rounded-[20px] bg-tan px-4 py-3">
      <span>
        <span className="block text-[12px] font-bold text-muted">{label}</span>
        <b className="text-[17px] font-extrabold">{unit(value)}</b>
      </span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label={`${label} weniger`} disabled={value <= min} onClick={() => set(value - 1)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-paper text-[20px] font-extrabold disabled:opacity-35">
          −
        </button>
        <button type="button" aria-label={`${label} mehr`} disabled={value >= maxV} onClick={() => set(value + 1)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-paper text-[20px] font-extrabold disabled:opacity-35">
          +
        </button>
      </span>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Reisedaten und Budget">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] max-w-md overflow-y-auto rounded-t-[28px] border-t border-line bg-sand px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,.25)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-peach" />
        <h2 className="text-[22px] font-extrabold tracking-[-0.03em]">Deine Reise</h2>
        <p className="mt-1 text-[14px] font-semibold text-muted">Gilt für alle Preise und die Liste.</p>

        <label className="mt-5 block rounded-[20px] bg-tan px-4 py-3">
          <span className="block text-[12px] font-bold text-muted">Anreise</span>
          <input
            type="date"
            value={an}
            min={today}
            onChange={(e) => e.target.value && setAn(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-[17px] font-extrabold outline-none"
          />
        </label>
        <div className="mt-2.5 grid gap-2.5">
          {stepper("Nächte", n, setN, 1, 30, (v) => `${v} ${v === 1 ? "Nacht" : "Nächte"}`)}
          {stepper("Personen", p, setP, 1, 8, (v) => `${v} ${v === 1 ? "Person" : "Personen"}`)}
        </div>

        <p className="mt-5 text-[14px] font-extrabold">Höchstens pro Nacht und Person</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[...MAX_OPTIONS, 0].map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={max === x}
              onClick={() => setMax(x)}
              className={`press rounded-full px-4 py-2.5 text-[14.5px] font-extrabold transition-colors ${max === x ? "bg-sun text-white" : "bg-peach text-sun-soft"}`}
            >
              {x ? `${x} €` : "Egal"}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => onSave({ an, n, p, max })} className="btn-chunky mt-6 w-full">
          Übernehmen
        </button>
      </div>
    </div>,
    document.body,
  );
}
