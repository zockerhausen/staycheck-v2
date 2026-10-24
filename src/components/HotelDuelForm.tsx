"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import type { Place } from "@/lib/geo";

type Slot = { input: string; loading: boolean; error: string; candidates: Place[]; chosen: number };
const empty = (): Slot => ({ input: "", loading: false, error: "", candidates: [], chosen: 0 });

const KIND: Record<string, string> = {
  hotel: "Hotel",
  hostel: "Hostel",
  guest_house: "Pension",
  apartment: "Apartment",
  address: "Adresse",
  other: "Ort",
};

/** Bis zu 3 Unterkünfte per Link oder Name eingeben und gegeneinander antreten lassen. */
export default function HotelDuelForm({ initial = [] }: { initial?: Place[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(() => {
    const pre = initial.slice(0, 3).map((p) => ({ ...empty(), input: p.name, candidates: [p] }));
    while (pre.length < 2) pre.push(empty());
    return pre;
  });

  const update = (i: number, patch: Partial<Slot>) =>
    setSlots((s) => s.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)));

  async function resolve(i: number, value?: string) {
    const input = (value ?? slots[i].input).trim();
    if (input.length < 3) return;
    update(i, { loading: true, error: "", candidates: [], chosen: 0 });
    try {
      const res = await fetch(`/api/aufloesen?u=${encodeURIComponent(input)}`);
      const json = (await res.json()) as { candidates: Place[]; error?: string };
      update(i, {
        loading: false,
        candidates: json.candidates,
        error: json.error ?? (json.candidates.length ? "" : "Nichts gefunden. Probier den Namen der Unterkunft und die Stadt."),
      });
    } catch {
      update(i, { loading: false, error: "Suche gerade nicht erreichbar." });
    }
  }

  const ready = slots.filter((s) => s.candidates.length > 0);

  function start() {
    if ("vibrate" in navigator) navigator.vibrate(12);
    const params = new URLSearchParams();
    for (const s of ready) {
      const p = s.candidates[s.chosen];
      params.append("h", [p.lat.toFixed(6), p.lon.toFixed(6), p.kind, p.name.slice(0, 80)].join("|"));
    }
    router.push(`/duell/hotels?${params}`);
  }

  return (
    <div className="space-y-4">
      {slots.map((s, i) => {
        const chosen = s.candidates[s.chosen];
        return (
          <div key={i} className="card p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-sand">{i + 1}</span>
              Unterkunft {i + 1}
            </p>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-tan px-3.5 py-3 focus-within:border-sun">
              <Icon name="hotel" size={22} className="text-sun" />
              <input
                value={s.input}
                onChange={(e) => update(i, { input: e.target.value })}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text) setTimeout(() => resolve(i, text), 0);
                }}
                onBlur={() => !s.candidates.length && !s.loading && resolve(i)}
                onKeyDown={(e) => e.key === "Enter" && resolve(i)}
                placeholder="Booking-Link, Hostelworld-Link oder Name"
                aria-label={`Unterkunft ${i + 1}`}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/70"
              />
              {s.loading && <span className="h-4 w-4 animate-spin rounded-full border-[3px] border-raised border-t-sun" />}
            </div>

            {s.error && <p className="mt-2 text-sm font-semibold text-peach-ink">{s.error}</p>}

            {chosen && (
              <div className="mt-3 rounded-2xl bg-sand p-3">
                <p className="text-xs font-semibold text-muted">Gefunden · {KIND[chosen.kind] ?? "Ort"}</p>
                <p className="font-semibold [overflow-wrap:anywhere]">{chosen.name}</p>
                <p className="truncate text-sm text-muted">{chosen.subtitle}</p>
                {s.candidates.length > 1 && (
                  <label className="mt-2 block text-sm">
                    <span className="text-muted">Nicht richtig? </span>
                    <select
                      value={s.chosen}
                      onChange={(e) => update(i, { chosen: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl bg-paper px-2 py-2"
                    >
                      {s.candidates.map((c, j) => (
                        <option key={j} value={j}>
                          {c.name} – {c.subtitle}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>
        );
      })}

      {slots.length < 3 && (
        <button
          type="button"
          onClick={() => setSlots((s) => [...s, empty()])}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-raised py-3 text-sm font-bold text-muted"
        >
          + Dritte Unterkunft
        </button>
      )}

      <button type="button" onClick={start} disabled={ready.length < 2} className="btn-chunky w-full disabled:opacity-50">
        <Icon name="duel" size={22} fill="#ffffff55" /> Lage-Duell starten
      </button>
      <p className="text-center text-xs text-muted">
        Funktioniert mit Links von Booking.com, Hostelworld, Agoda und Google Maps. Airbnb verrät die Lage erst nach der Buchung.
      </p>
    </div>
  );
}
