import Link from "next/link";
import { redirect } from "next/navigation";
import { getCriteria, getDistricts, getFavoriteIds, getSavedWeights, getUser } from "@/lib/data";
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
  const favs = districts.filter((d) => favorites.has(d.id));

  return (
    <div>
      <h1 className="font-display text-4xl">Deine Favoriten</h1>

      {favs.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-muted">
          Noch nichts gemerkt.{" "}
          <Link href="/finden" className="font-medium text-pine underline underline-offset-4">
            Finde deinen Kiez
          </Link>{" "}
          und tippe auf „Merken“.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {favs.map((d) => (
            <li key={d.id} className="rounded-2xl border border-line bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl">{d.name}</h2>
                <div className="flex items-center gap-3">
                  {weights && <span className="text-sm font-semibold text-pine">{matchScore(d, weights)}% Match</span>}
                  <FavoriteButton districtId={d.id} isFavorite />
                </div>
              </div>
              <p className="mb-4 text-sm text-muted">{d.short_description}</p>
              <ScoreBars criteria={criteria} scores={d.scores} />
            </li>
          ))}
        </ul>
      )}

      {favs.length >= 2 && (
        <Link
          href={`/vergleich?a=${favs[0].slug}&b=${favs[1].slug}`}
          className="mt-6 inline-block rounded-full border border-line bg-paper px-5 py-2.5 font-medium hover:border-pine"
        >
          Favoriten vergleichen
        </Link>
      )}
    </div>
  );
}
