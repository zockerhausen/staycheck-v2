"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { TRAITS, characterOf, characterTint, traitsOf, type TraitKey } from "@/lib/character";

export type ExplorerDistrict = {
  slug: string;
  city: string;
  name: string;
  short: string | null;
  scores: Record<string, number>;
  match?: number;
};

/**
 * Viertel stöbern ohne Quiz: Filter nach Eigenschaft (Feiern, Ruhig …).
 * variant „cards“ = wischbare Karten (Start), „list“ = Liste (Viertel-Seite).
 */
export default function DistrictExplorer({
  districts,
  variant = "cards",
  query = "",
}: {
  districts: ExplorerDistrict[];
  variant?: "cards" | "list";
  query?: string;
}) {
  const [filter, setFilter] = useState<TraitKey | null>(null);
  const available = TRAITS.filter((t) => districts.some((d) => traitsOf(d.scores).some((x) => x.key === t.key)));
  const shown = filter
    ? districts
        .filter((d) => traitsOf(d.scores).some((t) => t.key === filter))
        .sort((a, b) => {
          const c = TRAITS.find((t) => t.key === filter)!.criterion;
          return (b.scores[c] ?? 0) - (a.scores[c] ?? 0);
        })
    : districts;
  const href = (d: ExplorerDistrict) => `/kiez/${d.slug}?stadt=${d.city}${query ? `&${query}` : ""}`;

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Nach Eigenschaft filtern">
        <button
          type="button"
          onClick={() => setFilter(null)}
          aria-pressed={!filter}
          className={`press shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${!filter ? "bg-ink text-sand" : "bg-tan"}`}
        >
          Alle
        </button>
        {available.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              if ("vibrate" in navigator) navigator.vibrate(6);
              setFilter(filter === t.key ? null : t.key);
            }}
            aria-pressed={filter === t.key}
            className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold ${
              filter === t.key ? "bg-ink text-sand" : "bg-tan"
            }`}
          >
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      {variant === "cards" ? (
        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {shown.map((d) => (
            <Link
              key={d.slug}
              href={href(d)}
              className="press flex h-[200px] w-[72%] max-w-[260px] shrink-0 snap-start flex-col justify-end rounded-[22px] p-4"
              style={{ background: `linear-gradient(160deg, ${characterTint(d.scores)} 0%, #161618 85%)` }}
            >
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#ffb08f]">{characterOf(d.scores)}</span>
              <b className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-tight">{d.name.split(" (")[0]}</b>
              <span className="mt-1 line-clamp-2 text-[13px] text-muted">{d.short}</span>
              <span className="mt-3 flex flex-wrap gap-1.5">
                {traitsOf(d.scores)
                  .slice(0, 3)
                  .map((t) => (
                    <span key={t.key} className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-[11px] font-semibold">
                      <Icon name={t.icon} size={12} /> {t.label}
                    </span>
                  ))}
                {d.match !== undefined && (
                  <span className="ml-auto rounded-full bg-peach px-2 py-1 text-[11px] font-bold text-peach-ink">{d.match} %</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <ol className="mt-2">
          {shown.map((d) => (
            <li key={d.slug} id={`kiez-${d.slug}`} className="border-b border-line last:border-0">
              <Link href={href(d)} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: characterTint(d.scores) }}
                >
                  <Icon name={traitsOf(d.scores)[0]?.icon ?? "discover"} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{d.name}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {traitsOf(d.scores)
                      .slice(0, 3)
                      .map((t) => t.label)
                      .join(" · ") || "Von allem etwas"}
                  </span>
                </span>
                {d.match !== undefined ? (
                  <span className="w-12 text-right font-display text-[17px] font-extrabold tabular-nums text-sun-soft">{d.match}%</span>
                ) : (
                  <Icon name="chevron" size={16} className="text-faint" />
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
      {shown.length === 0 && <p className="mt-3 text-sm text-muted">Kein Viertel mit dieser Eigenschaft.</p>}
    </div>
  );
}
