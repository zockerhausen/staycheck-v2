"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { TRAITS, characterOf, characterTint, traitsOf, type TraitKey } from "@/lib/character";
import type { AreaPhoto } from "@/lib/photos";

export type ExplorerDistrict = {
  slug: string;
  city: string;
  name: string;
  short: string | null;
  scores: Record<string, number | null>;
  match?: number;
  href?: string; // eigener Link (z. B. automatische Viertel)
  photo?: AreaPhoto;
};

/**
 * Viertel und Ecken stöbern: oben Kategorien wie bei Airbnb (Feiern, Ruhig …), darunter die Gegenden.
 * variant „feed“ = große Karten untereinander (Start), „cards“ = wischbare Karten, „list“ = kompakte Liste.
 * topLabel: Hinweis auf der ersten Karte (z. B. „Passt am besten zu dir“).
 */
export default function DistrictExplorer({
  districts,
  variant = "cards",
  query = "",
  filters = true,
  topLabel,
}: {
  districts: ExplorerDistrict[];
  variant?: "feed" | "cards" | "list";
  query?: string;
  filters?: boolean;
  topLabel?: string;
}) {
  const [filter, setFilter] = useState<TraitKey | null>(null);
  const pool = districts.map((d) => d.scores); // Eigenschaften im Vergleich zur ganzen Stadt
  const tr = (d: ExplorerDistrict) => traitsOf(d.scores, pool);
  const available = TRAITS.filter((t) => districts.some((d) => tr(d).some((x) => x.key === t.key)));
  const shown = filter
    ? districts
        .filter((d) => tr(d).some((t) => t.key === filter))
        .sort((a, b) => {
          const c = TRAITS.find((t) => t.key === filter)!.criterion;
          return (b.scores[c] ?? 0) - (a.scores[c] ?? 0);
        })
    : districts;
  const href = (d: ExplorerDistrict) => d.href ?? `/kiez/${d.slug}?stadt=${d.city}${query ? `&${query}` : ""}`;
  const pick = (k: TraitKey | null) => {
    try {
      navigator.vibrate?.(8);
    } catch {
      /* egal */
    }
    setFilter(k);
  };

  return (
    <div>
      {filters && available.length > 0 && (
        <div className="-mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 [scrollbar-width:none]" role="group" aria-label="Nach Eigenschaft filtern">
          {[{ key: null, label: variant === "feed" ? "Für dich" : "Alle", icon: "star" as const }, ...available.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))].map(
            (t) => {
              const on = filter === t.key;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => pick(on ? null : t.key)}
                  aria-pressed={on}
                  className={`relative flex shrink-0 flex-col items-center gap-1.5 pb-3 pt-1 text-[13px] font-extrabold transition-colors ${on ? "text-ink" : "text-muted"}`}
                >
                  <Icon name={t.icon} size={24} fill={on ? undefined : "transparent"} />
                  {t.label}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-ink transition-transform duration-300 [transition-timing-function:cubic-bezier(.3,1.4,.5,1)] ${on ? "scale-x-100" : "scale-x-0"}`}
                  />
                </button>
              );
            },
          )}
        </div>
      )}

      {variant === "feed" ? (
        <div className="mt-5 grid gap-7">
          {shown.map((d, i) => {
            const traits = tr(d);
            const main = traits[0];
            return (
              <Link key={d.slug} id={`kiez-${d.slug}`} href={href(d)} className="press fade-up block" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
                <span
                  className="relative flex aspect-[16/10] items-end overflow-hidden rounded-[22px] p-4"
                  style={{ background: `linear-gradient(150deg, ${characterTint(d.scores, pool)} 0%, var(--color-tan) 100%)` }}
                >
                  {d.photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.photo.url} alt="" loading={i < 2 ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                      <span className="absolute bottom-2 right-3 max-w-[60%] truncate text-[10px] font-semibold text-white/80">
                        Foto: {d.photo.credit}, {d.photo.license}
                      </span>
                    </>
                  ) : (
                    <Icon name={main?.icon ?? "discover"} size={120} className="absolute -right-3 -top-2 text-ink/10" fill="transparent" />
                  )}
                  {i === 0 && !filter && topLabel && (
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-[13px] font-extrabold text-[#17171b] shadow-soft">{topLabel}</span>
                  )}
                  <span className={`relative text-[15px] font-extrabold ${d.photo ? "text-white" : "text-ink/80"}`}>{characterOf(d.scores, pool)}</span>
                </span>
                <span className="mt-3 flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <b className="block truncate text-[18px] font-black tracking-tight">{d.name.split(" (")[0]}</b>
                    <span className="block truncate text-[15px] font-semibold text-muted">
                      {[d.short, traits.slice(0, 2).map((t) => t.label).join(", ")].filter(Boolean).join(". ") || "Von allem etwas"}
                    </span>
                  </span>
                  {d.match !== undefined && (
                    <span className="shrink-0 text-right">
                      <b className="block text-[20px] font-black leading-none tabular-nums text-sun">{d.match}</b>
                      <span className="text-[12px] font-bold text-muted">Lage</span>
                    </span>
                  )}
                </span>
                {d.match !== undefined && (
                  <span className="mt-2.5 block h-[7px] overflow-hidden rounded-full bg-tan">
                    <span className="bar-grow block h-full rounded-full bg-sun" style={{ width: `${d.match}%` }} />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : variant === "cards" ? (
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {shown.map((d) => (
            <Link
              key={d.slug}
              id={`kiez-${d.slug}`}
              href={href(d)}
              className="press flex h-[190px] w-[72%] max-w-[260px] shrink-0 snap-start flex-col justify-end rounded-[22px] p-4"
              style={{ background: `linear-gradient(160deg, ${characterTint(d.scores, pool)} 0%, var(--color-paper) 90%)` }}
            >
              <span className="text-[13px] font-extrabold text-sun-soft">{characterOf(d.scores, pool)}</span>
              <b className="mt-1 text-[21px] font-black leading-tight tracking-tight">{d.name.split(" (")[0]}</b>
              <span className="mt-1 line-clamp-2 text-[14px] font-semibold text-muted">{d.short}</span>
              <span className="mt-3 flex flex-wrap items-center gap-1.5">
                {tr(d)
                  .slice(0, 2)
                  .map((t) => (
                    <span key={t.key} className="flex items-center gap-1 rounded-full bg-sand/80 px-2 py-1 text-[12px] font-bold">
                      <Icon name={t.icon} size={13} /> {t.label}
                    </span>
                  ))}
                {d.match !== undefined && <span className="ml-auto rounded-full bg-sun px-2.5 py-1 text-[12px] font-black text-white">{d.match}</span>}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <ol className="mt-2">
          {shown.map((d) => (
            <li key={d.slug} id={`kiez-${d.slug}`} className="border-b border-line last:border-0">
              <Link href={href(d)} className="press flex items-center gap-3 py-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: characterTint(d.scores, pool) }}>
                  <Icon name={tr(d)[0]?.icon ?? "discover"} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-extrabold">{d.name}</span>
                  <span className="block truncate text-[14px] font-semibold text-muted">
                    {tr(d)
                      .slice(0, 3)
                      .map((t) => t.label)
                      .join(", ") || "Von allem etwas"}
                  </span>
                </span>
                {d.match !== undefined ? (
                  <span className="w-12 text-right text-[18px] font-black tabular-nums text-sun">{d.match}</span>
                ) : (
                  <Icon name="chevron" size={16} className="text-faint" />
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
      {shown.length === 0 && <p className="mt-4 text-[15px] text-muted">Keine Gegend mit dieser Eigenschaft.</p>}
    </div>
  );
}
