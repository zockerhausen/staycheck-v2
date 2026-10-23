"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import type { Place } from "@/lib/geo";

const KIND_LABEL: Record<Place["kind"], string> = {
  hotel: "Hotel",
  hostel: "Hostel",
  guest_house: "Pension",
  apartment: "Apartment",
  address: "Adresse",
  other: "Ort",
};

/** Suchfeld mit Vorschlägen beim Tippen. Auswahl führt zum Lage-Check. */
export default function PlaceSearch({ weightsQuery }: { weightsQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        // Vorschläge leicht Richtung Berlin gewichten, weltweit bleibt aber alles findbar
        const res = await fetch(`/api/suche?q=${encodeURIComponent(q)}&lat=52.51&lon=13.40`);
        const json = (await res.json()) as { results: Place[]; error?: string };
        setResults(json.results);
        if (json.error) setError(json.error);
      } catch {
        setError("Suche gerade nicht erreichbar. Versuch es gleich nochmal.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q]);

  function choose(p: Place) {
    if ("vibrate" in navigator) navigator.vibrate(10);
    const params = new URLSearchParams({
      lat: p.lat.toFixed(6),
      lon: p.lon.toFixed(6),
      name: p.name,
      sub: p.subtitle,
      kind: p.kind,
    });
    router.push(`/check/ergebnis?${params}${weightsQuery ? `&${weightsQuery}` : ""}`);
  }

  return (
    <div>
      <label htmlFor="place-search" className="sr-only">
        Hotel oder Adresse suchen
      </label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-b-[5px] border-line bg-paper px-4 py-3 focus-within:border-sun">
        <Icon name="search" size={24} className="text-ink" />
        <input
          id="place-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="z. B. Generator Berlin Mitte"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted/70"
        />
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-sun border-t-transparent" />}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-peach-ink">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-2xl border-2 border-line bg-paper">
          {results.map((p, i) => (
            <li key={`${p.lat}-${p.lon}-${i}`} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => choose(p)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-sand"
              >
                <Icon name={p.kind === "address" || p.kind === "other" ? "check" : "hotel"} size={26} className="text-sun" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-sm text-muted">{p.subtitle}</span>
                </span>
                <span className="rounded-full bg-tan px-2 py-0.5 text-xs font-semibold text-muted">{KIND_LABEL[p.kind]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
