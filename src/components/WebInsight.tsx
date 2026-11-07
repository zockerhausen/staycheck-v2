import Icon from "@/components/Icon";
import type { AreaInsight } from "@/lib/insight-types";
import { safeHref } from "@/lib/safe-url";

const LABEL: Record<string, string> = {
  transit: "Anbindung",
  nightlife: "Nachtleben",
  food: "Essen",
  nature: "Grün & Wasser",
  quiet: "Ruhe nachts",
  budget: "Günstig",
  safety: "Sicherheit",
};
const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

/** „Was Reiseführer sagen“: Zusammenfassung seriöser Reisequellen zu einer Gegend, mit allen Quellen. */
export default function WebInsight({ insight }: { insight: AreaInsight | null }) {
  if (!insight) return null;
  const values = Object.entries(insight.values).filter(([, v]) => v);
  const date = insight.checked ? new Date(insight.checked).toLocaleDateString("de-DE", { month: "long", year: "numeric" }) : "";
  const goodFor = insight.goodFor ?? [];
  const watchOut = insight.watchOut ?? [];
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-[1.35rem] font-extrabold tracking-[-0.03em]">
        <Icon name="discover" size={22} className="text-sun" /> Was Reiseführer sagen
      </h2>
      {insight.summary && <p className="mt-2 text-[16px] font-semibold leading-snug">{insight.summary}</p>}

      {(goodFor.length > 0 || watchOut.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {goodFor.map((g) => (
            <span key={g} className="rounded-full bg-good/10 px-3 py-1.5 text-[13px] font-extrabold text-good">
              {g}
            </span>
          ))}
          {watchOut.map((w) => (
            <span key={w} className="rounded-full bg-warn/10 px-3 py-1.5 text-[13px] font-extrabold text-warn">
              {w}
            </span>
          ))}
        </div>
      )}

      {values.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {values.map(([k, v]) => (
            <li key={k} className="flex items-start gap-3">
              <span className="w-10 shrink-0 rounded-lg bg-sand py-1 text-center text-[15px] font-extrabold tabular-nums">{String(v!.v).replace(".", ",")}</span>
              <span className="min-w-0 text-[14px] font-semibold leading-snug">
                <b className="font-extrabold">{LABEL[k] ?? k}:</b> <span className="text-muted">{v!.why}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[13px] font-bold text-muted">Quellen ({insight.sources.length}), recherchiert im {date}:</p>
        <ul className="mt-2 space-y-1.5">
          {insight.sources.filter((s) => safeHref(s.url)).map((s) => (
            <li key={s.url}>
              <a href={safeHref(s.url)} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 text-[14px] font-bold">
                <Icon name="external" size={14} className="shrink-0 text-muted" />
                <span className="truncate">{s.title}</span>
                <span className="shrink-0 text-[12px] font-semibold text-muted">{host(s.url)}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] font-semibold leading-relaxed text-muted">
          Mit KI zusammengefasst, nur Werte mit mindestens zwei unabhängigen Quellen. Diese Werte zählen zur Hälfte im Lage-Score, die andere Hälfte sind unsere
          Messungen aus Kartendaten.
        </p>
      </div>
    </section>
  );
}
