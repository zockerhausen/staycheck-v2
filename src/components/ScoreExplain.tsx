import Link from "next/link";
import Icon from "@/components/Icon";
import { CRITERION_ICON } from "@/lib/icons";
import type { Criterion } from "@/lib/data";
import { matchBreakdown, type Coverage, type Detail, type Source } from "@/lib/score";
import { EXTRA_LABEL, MUST_CAP } from "@/lib/profile";

const SOURCE: Record<Source, string> = {
  messung: "gemessen",
  viertel: "Viertel-Einschätzung",
  gemischt: "gemessen + Einschätzung",
  keine: "keine Daten",
};
const COVERAGE_STYLE: Record<Coverage["level"], string> = {
  gut: "bg-[#3ecf8e]/10 text-[#3ecf8e]",
  mittel: "bg-tan text-muted",
  duenn: "bg-[#ffb547]/10 text-[#ffb547]",
};
const COVERAGE_LABEL: Record<Coverage["level"], string> = { gut: "Datenlage gut", mittel: "Datenlage mittel", duenn: "Datenlage dünn" };

/**
 * Macht den Score nachvollziehbar:
 * 1) Warum diese Zahl? (welches Kriterium wie stark zählt)
 * 2) Jeder Wert aufklappbar mit den Fakten dahinter und der Quelle
 * 3) Wie gut die Datenlage ist
 */
export default function ScoreExplain({
  criteria,
  details,
  weights,
  match,
  coverage,
  personal,
  must = null,
  capped = null,
}: {
  criteria: Criterion[];
  details: Record<string, Detail>;
  weights: Record<string, number>;
  match: number;
  coverage: Coverage;
  personal: boolean;
  must?: string | null;
  capped?: number | null; // ungedeckelter Wert, wenn das Muss fehlt
}) {
  const scores = Object.fromEntries(Object.entries(details).map(([k, d]) => [k, d.score]));
  const { rows, ignored } = matchBreakdown(scores, weights);
  const label = (k: string) => criteria.find((c) => c.key === k)?.label ?? EXTRA_LABEL[k] ?? k;
  const order = rows.map((r) => r.key).filter((k) => details[k]);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-[19px] font-extrabold">Warum {match}?</h2>

      <div className={`flex items-start gap-2.5 rounded-[18px] px-4 py-3 text-sm ${COVERAGE_STYLE[coverage.level]}`}>
        <Icon name={coverage.level === "duenn" ? "flag" : "check"} size={18} className="mt-0.5 shrink-0" />
        <span>
          <b className="font-bold">{COVERAGE_LABEL[coverage.level]}.</b> <span className="text-ink/80">{coverage.text}</span>
        </span>
      </div>

      <div className="card p-5">
        <p className="text-sm leading-relaxed text-muted">
          {personal
            ? "Der Score ist der Durchschnitt aller Werte, gewichtet nach deinem Reise-Profil. Was dir wichtig ist, zählt mehr."
            : "Der Score ist der Durchschnitt aller Werte mit einer Standard-Gewichtung. Mit dem Quiz rechnen wir nach deinen Wünschen."}
        </p>
        <ul className="mt-4 space-y-2.5">
          {rows
            .filter((r) => r.share > 0)
            .map((r) => (
              <li key={r.key} className="flex items-center gap-3 text-sm">
                <span className="flex w-32 shrink-0 items-center gap-2 font-semibold">
                  <Icon name={CRITERION_ICON[r.key]} size={18} /> {label(r.key)}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised" aria-hidden>
                  <span className="bar-grow block h-full rounded-full bg-sun-soft/70" style={{ width: `${r.share}%` }} />
                </span>
                <span className="w-24 text-right text-xs text-muted">
                  {r.key === must ? "Muss · " : ""}zählt {r.share} % · <b className="text-ink">{r.score}</b>/10
                </span>
              </li>
            ))}
        </ul>
        {capped !== null && (
          <p className="mt-3 text-xs font-semibold text-[#ffb547]">
            Gerechnet wären es {capped}. Weil dein Muss fehlt, zählen höchstens {MUST_CAP}.
          </p>
        )}
        {ignored.length > 0 && (
          <p className="mt-3 text-xs text-muted">Nicht eingerechnet, weil uns Daten fehlen: {ignored.map(label).join(", ")}.</p>
        )}
      </div>

      <div className="card px-5 py-2">
        {order.map((k) => {
          const d = details[k];
          return (
            <details key={k} className="group border-b border-line py-1 last:border-0">
              <summary className="flex cursor-pointer list-none items-center gap-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                <span className="flex w-32 shrink-0 items-center gap-2 font-semibold">
                  <Icon name={CRITERION_ICON[k]} size={18} /> {label(k)}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                  {d.score !== null && (
                    <span className={`bar-grow block h-full rounded-full ${d.score <= 4 ? "bg-faint" : "bg-sun"}`} style={{ width: `${d.score * 10}%` }} />
                  )}
                </span>
                <span className="w-7 text-right font-extrabold tabular-nums">{d.score ?? "–"}</span>
                <Icon name="down" size={14} className="text-faint transition group-open:rotate-180" />
              </summary>
              <div className="pb-3 pl-1">
                <ul className="space-y-1 text-sm">
                  {d.reasons.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                      {r}
                    </li>
                  ))}
                </ul>
                <span className="mt-2 inline-block rounded-full bg-tan px-2.5 py-1 text-[11px] font-bold text-muted">Quelle: {SOURCE[d.source]}</span>
              </div>
            </details>
          );
        })}
        <p className="py-3 text-xs leading-relaxed text-muted">
          Tippe auf einen Wert für die Fakten dahinter. Daten aus OpenStreetMap, Entfernungen als Fußweg geschätzt.{" "}
          <Link href="/methode" className="font-semibold text-sun-soft underline underline-offset-4">
            So rechnen wir genau
          </Link>
        </p>
      </div>
    </section>
  );
}
