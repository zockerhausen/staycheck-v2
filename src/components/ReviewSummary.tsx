import Icon from "@/components/Icon";
import { agreement, fairLabel, fmtScore, PLATFORM, type StayReviews } from "@/lib/reviews";

const fmtCount = (n: number) => n.toLocaleString("de-DE");

/** Bewertungen aller Plattformen auf einen Blick (Lage-Check einer Unterkunft) */
export default function ReviewSummary({ reviews }: { reviews: StayReviews }) {
  const agree = agreement(reviews.spread);
  const tone = agree.tone === "good" ? "text-[#3ecf8e]" : agree.tone === "mid" ? "text-muted" : "text-[#ffb547]";
  return (
    <section className="card p-5">
      {reviews.demo && (
        <p className="mb-4 flex items-start gap-2 rounded-[14px] border border-[#ffb547]/30 bg-[#ffb547]/10 px-3 py-2 text-xs font-semibold text-[#ffb547]">
          <Icon name="flag" size={14} className="mt-0.5 shrink-0" />
          Beispieldaten: Diese Bewertungen sind ausgedacht und nur in der Vorschau zu sehen. Echte Bewertungen folgen.
        </p>
      )}
      <h2 className="font-display text-[19px] font-extrabold">Was Gäste sagen</h2>
      <div className="mt-3 flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-peach">
          <b className="font-display text-[24px] font-extrabold leading-none text-peach-ink">{fmtScore(reviews.fair)}</b>
          <span className="mt-0.5 text-[10px] font-bold text-peach-ink/70">von 10</span>
        </span>
        <span className="min-w-0">
          <b className="block text-[17px]">{fairLabel(reviews.fair)}</b>
          <span className="block text-[13px] text-muted">
            {fmtCount(reviews.total)} Bewertungen auf {reviews.platforms.length} {reviews.platforms.length === 1 ? "Plattform" : "Plattformen"}
          </span>
          <span className={`mt-0.5 block text-[13px] font-semibold ${tone}`}>{agree.label}</span>
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {reviews.platforms.map((p) => {
          const meta = PLATFORM[p.platform];
          const row = (
            <>
              <span className="w-[92px] shrink-0 truncate text-sm font-semibold">{meta.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                <span className="block h-full rounded-full bg-sun" style={{ width: `${Math.max(4, p.score * 10)}%` }} />
              </span>
              <span className="w-[86px] shrink-0 text-right text-sm tabular-nums">
                <b>{fmtScore(p.raw)}</b>
                <span className="text-muted">/{meta.scale}</span> <span className="text-xs text-faint">({fmtCount(p.count)})</span>
              </span>
            </>
          );
          return (
            <li key={p.platform}>
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                  {row}
                </a>
              ) : (
                <div className="flex items-center gap-3">{row}</div>
              )}
            </li>
          );
        })}
      </ul>

      {reviews.snippets.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {reviews.snippets.map((s, i) => (
            <li key={i} className="rounded-[16px] bg-raised px-4 py-3">
              <p className="text-[15px] leading-snug">„{s.text}“</p>
              <p className="mt-1.5 text-xs text-muted">
                {fmtScore(s.score)}/10 · {PLATFORM[s.platform].label} · {s.when}
                {reviews.demo ? " · Beispiel" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Gesamtwert: alle Plattformen auf 10 Punkte umgerechnet und nach Anzahl gewichtet. Wenige Bewertungen zählen vorsichtiger.
      </p>
    </section>
  );
}
