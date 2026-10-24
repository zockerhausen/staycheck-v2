"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { rememberCity } from "@/app/actions";
import { FEATURED, POPULAR } from "@/lib/popular";

type Result = { ort: string; land: string; region: string; lat: number; lon: number; known: string | null; popular?: boolean };
type Recent = { ort: string; land: string; lat: number; lon: number; known: string | null };

const KEY = "sc_ziele"; // zuletzt gewählte Reiseziele, nur auf diesem Gerät

function readRecent(): Recent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.ort === "string" && Number.isFinite(r.lat)).slice(0, 5) : [];
  } catch {
    return [];
  }
}

/** „Wohin geht deine Reise?“ – jede Stadt der Welt. Geprüfte Städte (Berlin, Bangkok) zuerst. */
export default function DestinationSearch({ verified }: { verified: { slug: string; name: string; country: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Recent[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setRecent(readRecent()), []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }
    const ctl = new AbortController();
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/ziele?q=${encodeURIComponent(q.trim().slice(0, 80))}`, { signal: ctl.signal });
        const json = (await res.json()) as { results: Result[]; error?: string };
        setResults(json.results ?? []);
        if (json.error) setError(json.error);
        else if (!json.results?.length) setError("Keine Stadt gefunden. Versuch es mit dem englischen Namen.");
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setError("Suche gerade nicht erreichbar.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer.current);
      ctl.abort();
    };
  }, [q]);

  function go(r: Recent) {
    if ("vibrate" in navigator) navigator.vibrate(10);
    try {
      const list = [r, ...readRecent().filter((x) => !(x.ort === r.ort && x.land === r.land))].slice(0, 5);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // ohne Verlauf weiter
    }
    if (r.known) {
      void rememberCity(r.known);
      router.push(`/?ziel=${r.known}`);
    } else {
      const p = new URLSearchParams({ ort: r.ort.slice(0, 80), land: r.land.slice(0, 60), lat: r.lat.toFixed(4), lon: r.lon.toFixed(4) });
      router.push(`/ziel?${p}`);
    }
  }

  return (
    <div>
      <label htmlFor="ziel-search" className="sr-only">
        Reiseziel
      </label>
      <div className="flex items-center gap-3 rounded-[20px] border border-line bg-paper py-1.5 pl-4 pr-3 transition-colors focus-within:border-sun">
        <Icon name="plane" size={22} className="text-muted" />
        <input
          id="ziel-search"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Stadt, z. B. Lissabon oder Hanoi"
          autoComplete="off"
          maxLength={80}
          className="min-w-0 flex-1 bg-transparent py-3 text-[17px] outline-none placeholder:text-muted"
        />
        {loading && <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-raised border-t-sun" />}
      </div>

      {error && <p className="mt-3 px-1 text-sm font-semibold text-[#ffb547]">{error}</p>}

      {results.length > 0 && (
        <ul className="fade-up mt-2 overflow-hidden rounded-[18px] bg-paper">
          {results.map((r) => (
            <li key={`${r.ort}-${r.land}-${r.lat}`} className="border-b border-line last:border-0">
              <button type="button" onClick={() => go(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-tan">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised">
                  <Icon name="map" size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.ort}</span>
                  <span className="block truncate text-sm text-muted">{[r.region, r.land].filter(Boolean).join(", ")}</span>
                </span>
                {r.known ? (
                  <span className="rounded-full bg-peach px-2 py-1 text-[11px] font-bold text-peach-ink">geprüft</span>
                ) : (
                  r.popular && <span className="rounded-full bg-raised px-2 py-1 text-[11px] font-bold text-muted">beliebt</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!q && (
        <div className="mt-4 space-y-4">
          {recent.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[13px] font-semibold text-muted">Zuletzt</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={`${r.ort}-${r.land}`} type="button" onClick={() => go(r)} className="press rounded-full bg-tan px-4 py-2.5 text-sm font-semibold">
                    {r.ort}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 px-1 text-[13px] font-semibold text-muted">Beliebt bei Reisenden</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
              {FEATURED.map((slug) => POPULAR.find((p) => p.slug === slug)!).map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => go({ ort: p.ort, land: p.land, lat: p.lat, lon: p.lon, known: null })}
                  className="press shrink-0 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold"
                >
                  {p.ort}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 px-1 text-[13px] font-semibold text-muted">Geprüfte Städte, Viertel von uns bewertet</p>
            <div className="flex flex-wrap gap-2">
              {verified.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => go({ ort: c.name, land: c.country, lat: 0, lon: 0, known: c.slug })}
                  className="press flex items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold"
                >
                  <Icon name="check" size={15} /> {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
