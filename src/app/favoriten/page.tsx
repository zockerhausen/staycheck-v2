import Link from "next/link";
import { redirect } from "next/navigation";
import { getCriteria, getDistricts, getFavoriteIds, getSavedWeights, getUser, weightsToQuery } from "@/lib/data";
import { matchScore } from "@/lib/matching";
import ScoreBars from "@/components/ScoreBars";
import FavoriteButton from "@/components/FavoriteButton";

export const dynamic = "force-dynamic";

export default async function FavoritenPage() {
  if (!(await getUser())) redirect("/login?next=/favoriten");

  const [criteria, districts, favorites, weights] = await Promise.all([
    getCriteria(),
    getDistricts(),
    getFavoriteIds(),
    getSavedWeights(),
  ]);
  const favs = districts
    .filter((d) => favorites.has(d.id))
    .map((d) => ({ ...d, match: weights ? matchScore(d, weights) : null }))
    .sort((a, b) => (b.match ?? 0) - (a.match ?? 0));

  return (
    <div className="pt-2">
      <h1 className="font-display text-4xl font-extrabold">Gemerkt</h1>
      <p className="mt-1 text-muted">Deine Lieblings-Kieze an einem Ort.</p>

      {favs.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-line p-8 text-center">
          <p className="text-4xl" aria-hidden>
            🗺️
          </p>
          <p className="mt-2 font-semibold">Noch kein Kiez gemerkt</p>
          <p className="mt-1 text-sm text-muted">Mach das Quiz und tippe bei einem Kiez auf „Merken“.</p>
          <Link href="/quiz" className="btn-chunky mt-5 w-full">
            Quiz starten
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {favs.map((d) => (
            <li key={d.id} className="rounded-3xl border-2 border-b-[5px] border-line bg-paper p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-2xl font-extrabold">{d.name}</h2>
                {d.match !== null && (
                  <span className="rounded-2xl bg-sun px-3 py-1 font-display text-lg font-extrabold text-white">
                    {d.match}%
                  </span>
                )}
              </div>
              <p className="mb-4 mt-1 text-sm text-muted">{d.short_description}</p>
              <ScoreBars criteria={criteria} scores={d.scores} />
              <div className="mt-4 flex justify-end">
                <FavoriteButton districtId={d.id} isFavorite />
              </div>
            </li>
          ))}
        </ul>
      )}

      {favs.length >= 2 && (
        <Link
          href={`/duell?a=${favs[0].slug}&b=${favs[1].slug}${weights ? `&${weightsToQuery(weights)}` : ""}`}
          className="btn-chunky mt-6 w-full"
        >
          ⚔️ Favoriten ins Duell schicken
        </Link>
      )}
    </div>
  );
}
