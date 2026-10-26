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
  gut: "bg-good/10 text-good",
  mittel: "bg-tan text-muted",
  duenn: "bg-warn/10 text-warn",
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
  const { rows } = matchBreakdown(scores, weights);
  const label = (k: string) => criteria.find((c) => c.key === k)?.label ?? EXTRA_LABEL[k] ?? k;
  const shareOf = Object.fromEntries(rows.map((r) => [r.key, r.share]));
  // Was am meisten zählt zuerst, Werte ohne Daten ans Ende
  const order = [...rows]
    .sort((a, b) => Number(a.score === null) - Number(b.score === null) || b.share - a.share)
    .map((r) => r.key)
    .filter((k) => details[k]);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-[19px] font-extrabold">Warum {match}?</h2>

      <div className={`flex items-start gap-2.5 rounded-[18px] px-4 py-3 text-sm ${COVERAGE_STYLE[coverage.level]}`}>
        <Icon name={coverage.level === "duenn" ? "flag" : "check"} size={18} className="mt-0.5 shrink-0" />
        <span>
          <b className="font-bold">{COVERAGE_LABEL[coverage.level]}.</b> <span className="text-ink/80">{coverage.text}</span>
        </span>
      </div>

      <div className="card px-5 py-2">
        <p className="pb-1 pt-3 text-sm leading-relaxed text-muted">
          {personal
            ? "Der Score ist der Durchschnitt aller Werte, gewichtet nach deinem Reise-Profil. Was dir wichtig ist, zählt mehr."
            : "Der Score ist der Durchschnitt aller Werte mit einer Standard-Gewichtung. Mit dem Quiz rechnen wir nach deinen Wünschen."}
        </p>
        {capped !== null && (
          <p className="pt-2 text-xs font-semibold text-warn">
            Gerechnet wären es {capped}. Weil dein Muss fehlt, zählen höchstens {MUST_CAP}.
          </p>
        )}
        {order.map((k) => {
          const d = details[k];
          const share = shareOf[k] ?? 0;
          return (
            <details key={k} className="group border-b border-line py-1 last:border-0">
              <summary className="flex cursor-pointer list-none items-center gap-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                <span className="flex w-32 shrink-0 items-center gap-2">
                  <Icon name={CRITERION_ICON[k]} size={18} className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{label(k)}</span>
                    <span className="block text-[11px] text-muted">
                      {k === must ? <b className="text-sun-soft">Muss · </b> : null}
                      {d.score === null ? "nicht eingerechnet" : share > 0 ? `zählt ${share} %` : "zählt nicht"}
                    </span>
                  </span>
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
