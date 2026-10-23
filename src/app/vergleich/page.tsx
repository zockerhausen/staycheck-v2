import { getCriteria, getDistricts, getSavedWeights, weightsFromParams } from "@/lib/data";
import { matchScore } from "@/lib/matching";

export const dynamic = "force-dynamic";

export default async function VergleichPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [criteria, districts, saved] = await Promise.all([
    getCriteria(),
    getDistricts(),
    getSavedWeights(),
  ]);

  const fromUrl = weightsFromParams(params, criteria);
  const weights = Object.keys(fromUrl).length > 0 ? fromUrl : saved;

  const aSlug = typeof params.a === "string" ? params.a : districts[0]?.slug;
  const bSlug = typeof params.b === "string" ? params.b : districts[1]?.slug;
  const a = districts.find((d) => d.slug === aSlug) ?? districts[0];
  const b = districts.find((d) => d.slug === bSlug) ?? districts[1];

  return (
    <div>
      <h1 className="font-display text-4xl">Kieze vergleichen</h1>
      <p className="mt-1 text-muted">Wähle zwei Bezirke und sieh sie direkt nebeneinander.</p>

      <form className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        {/* Gewichte mitnehmen, damit der Match erhalten bleibt */}
        {Object.keys(fromUrl).map((k) => (
          <input key={k} type="hidden" name={k} value={fromUrl[k]} />
        ))}
        <select name="a" defaultValue={a?.slug} className="w-full rounded-xl border border-line bg-paper px-3 py-2.5">
          {districts.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <span className="font-display text-xl text-muted">vs</span>
        <select name="b" defaultValue={b?.slug} className="w-full rounded-xl border border-line bg-paper px-3 py-2.5">
          {districts.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <button className="col-span-3 rounded-full bg-pine px-6 py-3 font-medium text-white hover:bg-pine-dark">
          Vergleichen
        </button>
      </form>

      {a && b && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="grid grid-cols-[1fr_7rem_1fr] border-b border-line bg-sand/60 p-4 text-center sm:grid-cols-[1fr_9rem_1fr]">
            <div>
              <div className="font-display text-2xl">{a.name}</div>
              {weights && <div className="text-sm font-semibold text-pine">{matchScore(a, weights)}% Match</div>}
            </div>
            <div />
            <div>
              <div className="font-display text-2xl">{b.name}</div>
              {weights && <div className="text-sm font-semibold text-pine">{matchScore(b, weights)}% Match</div>}
            </div>
          </div>

          {criteria.map((c) => {
            const sa = a.scores[c.key] ?? 0;
            const sb = b.scores[c.key] ?? 0;
            return (
              <div
                key={c.key}
                className="grid grid-cols-[1fr_7rem_1fr] items-center gap-2 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[1fr_9rem_1fr]"
              >
                <Bar value={sa} win={sa > sb} align="right" />
                <div className="text-center text-sm text-muted">{c.label}</div>
                <Bar value={sb} win={sb > sa} align="left" />
              </div>
            );
          })}
        </div>
      )}

      {!weights && (
        <p className="mt-6 text-center text-sm text-muted">
          Tipp: Gib zuerst unter „Finden“ deine Wünsche an, dann siehst du hier auch den Match in Prozent.
        </p>
      )}
    </div>
  );
}

function Bar({ value, win, align }: { value: number; win: boolean; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      <div className={`h-2.5 flex-1 overflow-hidden rounded-full bg-sand ${align === "right" ? "rotate-180" : ""}`}>
        <div className={`h-full rounded-full ${win ? "bg-coral" : "bg-pine/60"}`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className={`w-5 text-center text-sm tabular-nums ${win ? "font-bold text-coral" : ""}`}>{value}</span>
    </div>
  );
}
