import { getCriteria, getDistricts, getSavedWeights, weightsFromParams } from "@/lib/data";
import { matchScore } from "@/lib/matching";
import { CRITERION_EMOJI } from "@/lib/quiz";

export const dynamic = "force-dynamic";

const selectClass =
  "w-full appearance-none rounded-2xl border-2 border-b-[5px] border-line bg-paper px-3 py-3 text-center font-display text-base font-bold";

export default async function DuellPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [criteria, districts, saved] = await Promise.all([getCriteria(), getDistricts(), getSavedWeights()]);

  const fromUrl = weightsFromParams(params, criteria);
  const weights = Object.keys(fromUrl).length > 0 ? fromUrl : saved;

  const a = districts.find((d) => d.slug === params.a) ?? districts.find((d) => d.slug === "kreuzberg") ?? districts[0];
  const b =
    districts.find((d) => d.slug === params.b && d.slug !== a?.slug) ??
    districts.find((d) => d.slug !== a?.slug && d.slug === "prenzlauer-berg") ??
    districts.find((d) => d.slug !== a?.slug);

  if (!a || !b) return <p>Keine Kieze gefunden.</p>;

  const winsA = criteria.filter((c) => (a.scores[c.key] ?? 0) > (b.scores[c.key] ?? 0)).length;
  const winsB = criteria.filter((c) => (b.scores[c.key] ?? 0) > (a.scores[c.key] ?? 0)).length;
  const matchA = weights ? matchScore(a, weights) : null;
  const matchB = weights ? matchScore(b, weights) : null;
  const winner =
    matchA !== null && matchB !== null
      ? matchA === matchB ? null : matchA > matchB ? a : b
      : winsA === winsB ? null : winsA > winsB ? a : b;

  return (
    <div className="pt-2">
      <h1 className="font-display text-4xl font-extrabold">Kiez-Duell</h1>
      <p className="mt-1 text-muted">Zwei Kieze, sieben Runden. Wer passt besser?</p>

      <form className="mt-6">
        {Object.entries(fromUrl).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select name="a" defaultValue={a.slug} className={selectClass} aria-label="Erster Kiez">
            {districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-display text-lg font-extrabold text-sand">
            VS
          </span>
          <select name="b" defaultValue={b.slug} className={selectClass} aria-label="Zweiter Kiez">
            {districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-chunky mt-3 w-full">⚔️ Duell starten</button>
      </form>

      <section className="mt-6 rounded-3xl border-2 border-b-[5px] border-line bg-paper p-5">
        <div className="pop-in text-center">
          {winner ? (
            <>
              <p className="text-sm font-semibold text-peach-ink">🏆 Sieger{weights ? " für dich" : ""}</p>
              <p className="font-display text-3xl font-extrabold">{winner.name}</p>
            </>
          ) : (
            <p className="font-display text-2xl font-extrabold">Unentschieden!</p>
          )}
          <div className="mt-3 flex items-center justify-center gap-6 font-display text-xl font-extrabold">
            <span className={winner?.slug === a.slug ? "text-sun" : "text-muted"}>
              {matchA !== null ? `${matchA}%` : `${winsA} Runden`}
            </span>
            <span className="text-sm text-muted">:</span>
            <span className={winner?.slug === b.slug ? "text-sun" : "text-muted"}>
              {matchB !== null ? `${matchB}%` : `${winsB} Runden`}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {criteria.map((c) => {
            const sa = a.scores[c.key] ?? 0;
            const sb = b.scores[c.key] ?? 0;
            return (
              <div key={c.key}>
                <p className="mb-1 text-center text-xs font-semibold text-muted">
                  {CRITERION_EMOJI[c.key]} {c.label}
                </p>
                <div className="grid grid-cols-2 items-center gap-2">
                  <Bar value={sa} win={sa > sb} side="left" />
                  <Bar value={sb} win={sb > sa} side="right" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!weights && (
        <p className="mt-4 text-center text-sm text-muted">
          Tipp: Mach zuerst das Quiz, dann entscheidet dein persönlicher Match das Duell.
        </p>
      )}
    </div>
  );
}

function Bar({ value, win, side }: { value: number; win: boolean; side: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-2 ${side === "left" ? "flex-row-reverse" : ""}`}>
      <div className="flex h-3.5 flex-1 overflow-hidden rounded-full bg-tan" style={{ justifyContent: side === "left" ? "flex-end" : "flex-start" }}>
        <div className={`h-full rounded-full ${win ? "bg-sun" : "bg-sun/35"}`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className={`w-5 text-center text-sm tabular-nums ${win ? "font-extrabold text-sun" : "font-semibold"}`}>{value}</span>
    </div>
  );
}
