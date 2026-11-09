"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { MAX_OPTIONS } from "@/lib/trip";
import { markReplace } from "@/components/BackButton";
import StayMap, { type StayPin } from "@/components/StayMap";
import type { ZonePoint } from "@/lib/zones";

type Chip = { key: string; label: string; href: string; active: boolean };

const fmt = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "short" });

/**
 * Unterkünfte in einem Viertel, aus einem Guss – mit genau einer Karte:
 * Suchzeile (Daten, Personen, Budget → Fenster von unten), die Karte mit dem markierten Viertel und allen Unterkünften darin,
 * Filter, dann die Liste. Antippen (Liste oder Karte) zeigt nur diese eine Unterkunft; Preise öffnen sich bei Booking.com.
 */
export default function StaysPanel({
  checkin,
  checkout,
  nights,
  adults,
  max,
  chips,
  area,
  stays,
  zones,
  children,
}: {
  checkin: string;
  checkout: string;
  nights: number;
  adults: number;
  max: number | null;
  chips: Chip[];
  /** Das Viertel: Mitte, Umkreis in Metern, Name */
  area: { lat: number; lon: number; radius: number; name: string };
  /** Alle Unterkünfte im Viertel (gleiche Reihenfolge wie die Liste) */
  stays: StayPin[];
  zones: ZonePoint[];
  children: React.ReactNode;
}) {
  const [sheet, setSheet] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Gewählte Unterkunft steht in der Adresse (?wahl=…), ohne neuen Schritt im Verlauf: zurückkommen = gleiche Ansicht
  const w = Number(params.get("wahl") ?? NaN);
  const [sel, setSelState] = useState<number | null>(Number.isInteger(w) && w >= 0 && w < stays.length ? w : null);
  function setSel(i: number | null) {
    setSelState(i);
    const u = new URL(window.location.href);
    if (i === null) u.searchParams.delete("wahl");
    else u.searchParams.set("wahl", String(i));
    markReplace();
    window.history.replaceState(window.history.state, "", u);
  }
  // Andere Liste (Filter, Reisedaten): Auswahl aufheben
  const shownStays = useRef(stays);
  useEffect(() => {
    if (shownStays.current === stays) return;
    shownStays.current = stays;
    setSelState(null);
  }, [stays]);

  // Antippen in der Liste: die Karte zeigt nur diese Unterkunft
  useEffect(() => {
    const on = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n !== "number") return;
      setSel(n);
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("sc-stay-select", on);
    return () => window.removeEventListener("sc-stay-select", on);
  }, []);

  function save(next: { an: string; n: number; p: number; max: number }) {
    const q = new URLSearchParams(params.toString());
    q.set("an", next.an);
    q.set("n", String(next.n));
    q.set("p", String(next.p));
    q.set("max", String(next.max));
    q.delete("typ");
    q.delete("wahl");
    setSheet(false);
    markReplace();
    start(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  }

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

      {/* Die eine Karte: Viertel markiert, alle Unterkünfte darin */}
      <div ref={mapRef} className="mt-3 scroll-mt-4">
        <div className="relative h-[min(58dvh,480px)] overflow-hidden rounded-3xl bg-paper">
          <StayMap stays={stays} zones={zones} area={area} sel={sel} onSel={setSel} />
        </div>
      </div>

      {chips.length > 1 && (
        <nav className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Unterkunftsart">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              scroll={false}
              replace
              onClick={markReplace}
              aria-current={c.active ? "true" : undefined}
              className={`press shrink-0 rounded-full px-3.5 py-2 text-[13.5px] font-extrabold transition-colors ${c.active ? "bg-ink text-sand" : "bg-tan text-muted"}`}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      )}
      {children}

      {sheet && <TripSheet initial={{ an: checkin, n: nights, p: adults, max: max ?? 0 }} onClose={() => setSheet(false)} onSave={save} />}
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
