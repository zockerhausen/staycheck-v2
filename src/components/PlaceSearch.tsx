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

// Sieht die Eingabe wie ein Link aus? Dann löst der Server ihn sicher auf (nur bekannte Anbieter).
const looksLikeLink = (s: string) => /^https?:\/\//i.test(s) || (/^[\w-]+(\.[\w-]+)+\//.test(s) && !s.includes(" "));

/**
 * Große Suche für Start und Lage-Check: Name, Adresse oder Link (Booking, Hostelworld, Agoda, Google Maps).
 * Dazu „Mein Standort“ und „Link einfügen“. Auswahl führt zum Lage-Check.
 */
export default function PlaceSearch({
  weightsQuery = "",
  near,
  autoFocus = false,
  showChips = true,
}: {
  weightsQuery?: string;
  near?: { lat: number; lon: number };
  autoFocus?: boolean;
  showChips?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    clearTimeout(timer.current);
    const value = q.trim();
    if (value.length < 3) {
      setResults([]);
      setError("");
      setNote("");
      return;
    }
    const ctl = new AbortController();
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      setNote("");
      try {
        if (looksLikeLink(value)) {
          const res = await fetch(`/api/aufloesen?u=${encodeURIComponent(value.slice(0, 500))}`, { signal: ctl.signal });
          const json = (await res.json()) as { query?: string; candidates: Place[]; error?: string };
          setResults(json.candidates ?? []);
          if (json.error) setError(json.error);
          else if (json.candidates?.length) setNote(json.query ? `Aus deinem Link: „${json.query}“` : "Aus deinem Link erkannt");
          else setError("Aus diesem Link konnten wir nichts erkennen. Gib einfach den Namen ein.");
        } else {
          const near_ = near ? `&lat=${near.lat}&lon=${near.lon}` : "";
          const res = await fetch(`/api/suche?q=${encodeURIComponent(value.slice(0, 120))}${near_}`, { signal: ctl.signal });
          const json = (await res.json()) as { results: Place[]; error?: string };
          setResults(json.results ?? []);
          if (json.error) setError(json.error);
          else if (!json.results?.length) setError("Nichts gefunden. Versuch es mit Straße und Stadt.");
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setError("Suche gerade nicht erreichbar. Versuch es gleich nochmal.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer.current);
      ctl.abort();
    };
  }, [q, near?.lat, near?.lon]);

  function choose(p: Place) {
    if ("vibrate" in navigator) navigator.vibrate(10);
    const params = new URLSearchParams({
      lat: p.lat.toFixed(6),
      lon: p.lon.toFixed(6),
      name: p.name.slice(0, 120),
      sub: p.subtitle.slice(0, 200),
      kind: p.kind,
    });
    router.push(`/check/ergebnis?${params}${weightsQuery ? `&${weightsQuery}` : ""}`);
  }

  function locate() {
    if (!("geolocation" in navigator)) return setError("Dein Gerät gibt keinen Standort frei.");
    setNote("Standort wird gesucht …");
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        choose({ name: "Mein Standort", subtitle: "aktuelle Position", lat: pos.coords.latitude, lon: pos.coords.longitude, kind: "other" }),
      () => {
        setNote("");
        setError("Standort nicht freigegeben. Du kannst die Adresse auch eintippen.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim().slice(0, 500);
      if (text) setQ(text);
    } catch {
      setNote("Füge den Link einfach ins Suchfeld ein.");
    }
    inputRef.current?.focus();
  }

  return (
    <div>
      <label htmlFor="place-search" className="sr-only">
        Hotel, Adresse oder Link
      </label>
      <div className="flex items-center gap-3 rounded-[20px] border border-line bg-paper py-1.5 pl-4 pr-2 transition-colors focus-within:border-sun">
        <Icon name="search" size={22} className="text-muted" />
        <input
          id="place-search"
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hotel, Adresse oder Link"
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={500}
          className="min-w-0 flex-1 bg-transparent py-3 text-[17px] outline-none placeholder:text-muted"
        />
        {loading ? (
          <span className="mx-2.5 h-5 w-5 animate-spin rounded-full border-[3px] border-raised border-t-sun" />
        ) : (
          <button
            type="button"
            onClick={paste}
            aria-label="Link einfügen"
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-raised"
          >
            <Icon name="link" size={18} />
          </button>
        )}
      </div>

      {(note || error) && (
        <p className={`mt-3 px-1 text-sm font-semibold ${error ? "text-warn" : "text-muted"}`}>{error || note}</p>
      )}

      {results.length > 0 && (
        <ul className="fade-up mt-2 overflow-hidden rounded-[18px] bg-paper">
          {results.map((p, i) => (
            <li key={`${p.lat}-${p.lon}-${i}`} className="border-b border-line last:border-0">
              <button type="button" onClick={() => choose(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-tan">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised">
                  <Icon name={p.kind === "address" || p.kind === "other" ? "check" : "hotel"} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{p.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {KIND_LABEL[p.kind]} · {p.subtitle}
                  </span>
                </span>
                <Icon name="forward" size={16} className="text-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showChips && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          <button type="button" onClick={locate} className="press flex shrink-0 items-center gap-1.5 rounded-full bg-tan px-3.5 py-2.5 text-sm font-semibold">
            <Icon name="locate" size={16} /> Mein Standort
          </button>
          <a href="/duell/hotels" className="press flex shrink-0 items-center gap-1.5 rounded-full bg-tan px-3.5 py-2.5 text-sm font-semibold">
            <Icon name="duel" size={16} /> Unterkünfte vergleichen
          </a>
        </div>
      )}
    </div>
  );
}
