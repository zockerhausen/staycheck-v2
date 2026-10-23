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
import { CRITERION_EMOJI } from "@/lib/quiz";
import Reveal from "@/components/Reveal";
import KiezMap from "@/components/KiezMap";
import ScoreBars from "@/components/ScoreBars";
import ShareButton from "@/components/ShareButton";
import SaveButton from "@/components/SaveButton";
import FavoriteButton from "@/components/FavoriteButton";

export const dynamic = "force-dynamic";

export default async function ErgebnisPage({
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
  if (Object.keys(weights).length === 0) redirect("/quiz");

  const ranked = rankDistricts(districts, weights);
  const [top, ...rest] = ranked;
  if (!top) redirect("/");

  const labelOf = Object.fromEntries(criteria.map((c) => [c.key, c.label]));
  const query = weightsToQuery(weights);
  const reasons = topReasons(top, weights, 3);
  const points = ranked
    .filter((d) => d.lat !== null && d.lng !== null)
    .map((d) => ({ slug: d.slug, name: d.name, lat: d.lat as number, lng: d.lng as number, match: d.match }));

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-extrabold text-sun">
          StayCheck
        </Link>
        <Link href="/quiz" className="text-sm font-semibold text-muted">
          ↻ Quiz neu
        </Link>
      </div>

      <section>
        <Reveal name={top.name} match={top.match} celebrate={params.neu === "1"} />
        <div className="mt-4 flex flex-wrap gap-2">
          {reasons.map((k) => (
            <span key={k} className="rounded-full bg-peach px-3 py-1.5 text-sm font-semibold text-peach-ink">
              {CRITERION_EMOJI[k]} {labelOf[k]}
            </span>
          ))}
        </div>
        <p className="mt-3 text-muted">{top.short_description}</p>
      </section>

      <div className="space-y-3">
        <ShareButton name={top.name} match={top.match} tags={reasons.map((k) => labelOf[k])} />
        <SaveButton
          loggedIn={Boolean(user)}
          weights={weights}
          districtId={top.id}
          alreadySaved={favorites.has(top.id)}
          returnTo={`/ergebnis?${query}`}
        />
      </div>

      <section>
        <h2 className="font-display text-xl font-bold">Alle Kieze auf der Karte</h2>
        <p className="mb-3 text-sm text-muted">Die Zahl ist dein Match. Tipp auf einen Punkt.</p>
        <KiezMap points={points} highlight={top.slug} />
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Weitere Kieze für dich</h2>
        <p className="mb-3 text-sm text-muted">Wisch zur Seite →</p>
        <div className="snap-row -mx-4 px-4">
          {[top, ...rest].map((d, i) => (
            <article
              key={d.id}
              id={`kiez-${d.slug}`}
              className="flex flex-col rounded-3xl border-2 border-b-[5px] border-line bg-paper p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted">#{i + 1}</p>
                  <h3 className="font-display text-2xl font-extrabold leading-tight">{d.name}</h3>
                </div>
                <span className="rounded-2xl bg-sun px-3 py-1.5 font-display text-lg font-extrabold text-white">
                  {d.match}%
                </span>
              </div>
              <p className="mb-4 mt-1 text-sm text-muted">{d.short_description}</p>
              <ScoreBars criteria={criteria} scores={d.scores} />
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <Link
                  href={`/duell?a=${top.slug === d.slug ? d.slug : top.slug}&b=${top.slug === d.slug ? rest[0]?.slug ?? d.slug : d.slug}&${query}`}
                  className="text-sm font-bold text-sun"
                >
                  ⚔️ Ins Duell
                </Link>
                {user && <FavoriteButton districtId={d.id} isFavorite={favorites.has(d.id)} />}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
