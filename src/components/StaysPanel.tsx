"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { isDarkNow } from "@/components/ThemeSwitch";
import { partnerOn, stayMapUrl } from "@/lib/partner";
import { MAX_OPTIONS } from "@/lib/trip";

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
  chips,
  map,
  children,
}: {
  checkin: string;
  checkout: string;
  nights: number;
  adults: number;
  max: number | null;
  count?: number;
  chips: Chip[];
  map: { lat: number; lon: number; place: string; campaign: string; area?: string | null };
  children: React.ReactNode;
}) {
  const [sheet, setSheet] = useState(false);
  const [big, setBig] = useState(false); // Preiskarte im Vollbild
  const [consent, setConsent] = useState<boolean | null>(null);
  const [origin, setOrigin] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "1");
    } catch {
      setConsent(false);
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

  function allow() {
    setConsent(true);
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* egal */
    }
  }

  const url = origin
    ? stayMapUrl({
        lat: map.lat,
        lon: map.lon,
        zoom: 14,
        campaign: map.campaign,
        checkin,
        checkout,
        adults,
        maxPrice: max,
        dark: isDarkNow(),
        area: map.area,
        origin,
      })
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

      {/* Hauptkarte: echte Preise (Stay22) + unsere beste Lage in Violett */}
      {partnerOn && (
        <div ref={mapRef} className="mt-3 scroll-mt-4">
          <div className="relative h-[min(58dvh,480px)] overflow-hidden rounded-3xl bg-paper">
            {consent && url && !big ? (
              <iframe
                key={url}
                src={url}
                title={`Unterkünfte mit Preisen rund um ${map.place}`}
                className="absolute inset-0 h-full w-full border-0"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              />
            ) : consent === false ? (
              <MapConsent onYes={allow} />
            ) : null}
            {consent && (
              <button
                type="button"
                onClick={() => setBig(true)}
                aria-label="Karte groß machen"
                className="press glass absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--sc-glass-line)] shadow-soft"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 px-1 text-[12.5px] font-bold text-muted">
            {map.area && (
              <>
                <span className="h-[3px] w-5 shrink-0 rounded-full bg-[#8c7ff6]" aria-hidden />
                <span className="min-w-0 truncate">Innerhalb: beste Lage für dich</span>
              </>
            )}
            <span className="ml-auto shrink-0 rounded-full bg-tan px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">Anzeige</span>
          </div>
        </div>
      )}

      {chips.length > 1 && (
        <nav className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Unterkunftsart">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              scroll={false}
              aria-current={c.active ? "true" : undefined}
              className={`press shrink-0 rounded-full px-3.5 py-2 text-[13.5px] font-extrabold transition-colors ${c.active ? "bg-ink text-sand" : "bg-tan text-muted"}`}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      )}
      {children}

      {big && url && <PriceMap url={url} title={`Freie Zimmer · ${map.place}`} sub={`${fmt(checkin)} – ${fmt(checkout)} · ${max ? `bis ${max} € pro Nacht` : "jedes Budget"}`} onClose={() => setBig(false)} />}
      {sheet && <TripSheet initial={{ an: checkin, n: nights, p: adults, max: max ?? 0 }} onClose={() => setSheet(false)} onSave={save} />}
    </div>
  );
}

/** Zustimmung, bevor die Karte unseres Partners lädt (einmalig, wird gemerkt) */
function MapConsent({ onYes }: { onYes: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-peach text-sun-soft">
        <Icon name="map" size={30} />
      </span>
      <b className="text-[19px] font-extrabold">Preise und beste Lage auf einer Karte</b>
      <p className="text-[14px] font-semibold text-muted">
        Freie Zimmer mit Preis pro Nacht von Booking.com, dazu violett unsere beste Lage für dich. Die Karte kommt von unserem Partner Stay22, dabei
        wird deine IP-Adresse übertragen.
      </p>
      <button type="button" onClick={onYes} className="press shadow-primary mt-1 rounded-full bg-sun px-6 py-3 text-[15px] font-extrabold text-white">
        Karte laden
      </button>
    </div>
  );
}

/** Dieselbe Preiskarte im Vollbild: zum bequemen Schieben, ohne dass die Seite mitscrollt */
function PriceMap({ url, title, sub, onClose }: { url: string; title: string; sub: string; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-sand transition-[opacity,transform] duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Schließen" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tan">
          <Icon name="close" size={18} />
        </button>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[16px] font-extrabold">{title}</b>
          <span className="block truncate text-[12.5px] font-semibold text-muted">{sub}</span>
        </span>
        <span className="shrink-0 rounded-full bg-tan px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-muted">Anzeige</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <iframe
          src={url}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
        />
      </div>
    </div>,
    document.body,
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
