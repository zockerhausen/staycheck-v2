import type { Criterion } from "@/lib/data";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";

const ORIGIN_LABEL = { karte: "Aus Kartendaten berechnet", quelle: "Aus Quellen belegt", schaetzung: "Geschätzt, noch nicht belegt", gemischt: "Kartendaten und Reiseführer (Wikivoyage)" } as const;

/**
 * Viertel-Werte als Balken. Mit reasons/origin: jeder Wert lässt sich antippen und zeigt, woher er kommt.
 * Fehlt ein Wert, steht „–“ (keine verlässlichen Daten) statt einer erfundenen Zahl.
 */
export default function ScoreBars({
  criteria,
  scores,
  reasons,
  origin,
  links,
}: {
  criteria: Criterion[];
  scores: Record<string, number>;
  reasons?: Record<string, string>;
  origin?: Record<string, "karte" | "quelle" | "schaetzung" | "gemischt">;
  links?: Record<string, string>;
}) {
  return (
    <dl className="divide-y divide-line">
      {criteria.map((c) => {
        const s = scores[c.key];
        const why = reasons?.[c.key];
        const from = origin?.[c.key];
        const row = (
          <>
            <dt className="flex w-32 shrink-0 items-center gap-2 truncate font-semibold">
              <Icon name={CRITERION_ICON[c.key]} size={18} /> {c.label}
            </dt>
            <dd className="h-2 flex-1 overflow-hidden rounded-full bg-peach">
              {s != null && <div className={`bar-grow h-full rounded-full ${s <= 4 ? "bg-faint" : "bg-sun"}`} style={{ width: `${s * 10}%` }} />}
            </dd>
            <span className="w-6 text-right font-extrabold tabular-nums">{s ?? "–"}</span>
          </>
        );
        if (!why && !from) {
          return (
            <div key={c.key} className="flex items-center gap-3 py-2 text-sm">
              {row}
            </div>
          );
        }
        return (
          <details key={c.key} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
              {row}
              <Icon name="down" size={14} className="text-muted transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="pb-2.5 pl-[26px] text-[13.5px] font-semibold leading-snug">
              {why && <p>{why}</p>}
              {from && <p className="mt-0.5 text-muted">{ORIGIN_LABEL[from]}</p>}
              {links?.[c.key] && (
                <a href={links[c.key]} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-bold text-sun-soft underline underline-offset-4">
                  Quelle lesen <Icon name="external" size={12} fill="transparent" />
                </a>
              )}
            </div>
          </details>
        );
      })}
    </dl>
  );
}
