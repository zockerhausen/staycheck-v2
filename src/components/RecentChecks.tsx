"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

// „Zuletzt geprüft“ bleibt nur auf diesem Gerät (localStorage), nichts geht an den Server.
const KEY = "sc_recent";
export type RecentCheck = { name: string; sub: string; lat: number; lon: number; kind: string; match: number; label: string; at: number };

function read(): RecentCheck[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((r) => r && Number.isFinite(r.lat) && Number.isFinite(r.lon) && typeof r.name === "string")
      .slice(0, 8);
  } catch {
    return [];
  }
}

/** Auf der Ergebnis-Seite einbauen: merkt sich den geprüften Ort. */
export function RememberCheck(props: Omit<RecentCheck, "at">) {
  useEffect(() => {
    try {
      const list = read().filter((r) => !(Math.abs(r.lat - props.lat) < 1e-5 && Math.abs(r.lon - props.lon) < 1e-5));
      list.unshift({ ...props, name: props.name.slice(0, 120), sub: props.sub.slice(0, 200), at: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
    } catch {
      // privater Modus o. Ä. – dann eben ohne Verlauf
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lat, props.lon]);
  return null;
}

function ago(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  return d < 1 ? "heute" : d < 2 ? "gestern" : `vor ${d} Tagen`;
}

export default function RecentChecks() {
  const [list, setList] = useState<RecentCheck[]>([]);
  useEffect(() => setList(read().slice(0, 3)), []);
  if (!list.length) return null;

  return (
    <section className="mt-7">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-extrabold">Zuletzt geprüft</h2>
        <Link href="/favoriten" className="text-sm font-semibold text-muted">
          Gemerkt
        </Link>
      </div>
      <ul>
        {list.map((r) => (
          <li key={`${r.lat},${r.lon}`} className="border-b border-line last:border-0">
            <Link
              href={`/check/ergebnis?${new URLSearchParams({ lat: r.lat.toFixed(6), lon: r.lon.toFixed(6), name: r.name, sub: r.sub, kind: r.kind })}`}
              className="flex items-center gap-3.5 py-3"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tan">
                <Icon name="check" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{r.name}</span>
                <span className="block truncate text-[13px] text-muted">
                  {ago(r.at)} · {r.label}
                </span>
              </span>
              <span className="font-display text-[17px] font-extrabold text-sun-soft">{r.match}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
