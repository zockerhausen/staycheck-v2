import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCriteria,
  getDistricts,
  getFavoriteIds,
  getUser,
  weightsFromParams,
  weightsToQuery,
} from "@/lib/data";
import { rankDistricts, topReasons } from "@/lib/matching";
import ScoreBars from "@/components/ScoreBars";
import FavoriteButton from "@/components/FavoriteButton";

export const dynamic = "force-dynamic";

export default async function ErgebnissePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [criteria, districts, favorites, user] = await Promise.all([
    getCriteria(),
    getDistricts(),
    getFavoriteIds(),
    getUser(),
  ]);

  const weights = weightsFromParams(params, criteria);
  if (Object.keys(weights).length === 0) redirect("/finden");

  const ranked = rankDistricts(districts, weights);
  const labelOf = Object.fromEntries(criteria.map((c) => [c.key, c.label]));
  const query = weightsToQuery(weights);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Deine Kieze in Berlin</h1>
          <p className="mt-1 text-muted">Sortiert danach, wie gut sie zu deinen Wünschen passen.</p>
        </div>
        <Link href="/finden" className="text-sm font-medium text-pine underline underline-offset-4">
          Wünsche ändern
        </Link>
      </div>

      <ol className="mt-8 space-y-4">
        {ranked.map((d, i) => {
          const others = ranked.filter((o) => o.slug !== d.slug);
          const compareWith = i === 0 ? others[0] : ranked[0];
          return (
            <li key={d.id} className="rounded-2xl border border-line bg-paper p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl ${
                    i === 0 ? "bg-coral text-white" : "bg-sand text-pine"
                  }`}
                >
                  <span className="text-xl font-bold tabular-nums">{d.match}%</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-80">Match</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-2xl">
                      <span className="mr-2 text-muted">{i + 1}.</span>
                      {d.name}
                    </h2>
                    {user ? (
                      <FavoriteButton districtId={d.id} isFavorite={favorites.has(d.id)} />
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">{d.short_description}</p>
                  <p className="mt-1 text-sm">
                    Stark bei:{" "}
                    <span className="font-medium text-pine">
                      {topReasons(d, weights).map((k) => labelOf[k]).join(" und ")}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ScoreBars criteria={criteria} scores={d.scores} />
              </div>
              {compareWith && (
                <Link
                  href={`/vergleich?a=${d.slug}&b=${compareWith.slug}&${query}`}
                  className="mt-4 inline-block text-sm font-medium text-pine underline underline-offset-4"
                >
                  Mit {compareWith.name} vergleichen
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {!user && (
        <p className="mt-8 rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-pine underline underline-offset-4">
            Melde dich an
          </Link>
          , um deine Wünsche zu speichern und Kieze als Favoriten zu merken.
        </p>
      )}
    </div>
  );
}
