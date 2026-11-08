"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";

const fmt = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "short" });

/**
 * Reisedaten für alle Preise auf der Seite: Anreise, Nächte, Personen.
 * Steht in der Adresse (an, n, p), damit Preis-Links und Karte dieselben Daten nutzen.
 */
export default function TripBar({ checkin, checkout, nights, adults }: { checkin: string; checkout: string; nights: number; adults: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [an, setAn] = useState(checkin);
  const [n, setN] = useState(nights);
  const [p, setP] = useState(adults);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function apply() {
    const q = new URLSearchParams(params.toString());
    q.set("an", an);
    q.set("n", String(n));
    q.set("p", String(p));
    setOpen(false);
    start(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  }

  const field = "mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-[15px] font-bold";
  return (
    <div className="card mb-3 px-3.5 py-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="press flex w-full items-center gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-peach text-sun-soft">
          <Icon name="calendar" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold">
            {fmt(checkin)} – {fmt(checkout)}
          </span>
          <span className="block text-[13px] font-semibold text-muted">
            {nights} {nights === 1 ? "Nacht" : "Nächte"} · {adults} {adults === 1 ? "Person" : "Personen"} · für alle Preise
          </span>
        </span>
        <span className="text-[13px] font-extrabold text-sun-soft">{pending ? "…" : open ? "Fertig" : "Ändern"}</span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <label className="block min-w-0">
            <span className="text-[12px] font-bold text-muted">Anreise</span>
            <input type="date" value={an} min={today} onChange={(e) => e.target.value && setAn(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-muted">Nächte</span>
            <select value={n} onChange={(e) => setN(Number(e.target.value))} className={field}>
              {[1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-muted">Personen</span>
            <select value={p} onChange={(e) => setP(Number(e.target.value))} className={field}>
              {[1, 2, 3, 4, 5, 6].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={apply} className="press col-span-3 mt-1 rounded-full bg-sun py-3 text-[15px] font-extrabold text-white">
            Übernehmen
          </button>
        </div>
      )}
    </div>
  );
}
