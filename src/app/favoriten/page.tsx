import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCriteria,
  getDistricts,
  getFavoriteIds,
  getSavedPlaces,
  getSavedWeights,
  getUser,
  weightsToQuery,
} from "@/lib/data";
import { matchScore } from "@/lib/matching";
import ScoreBars from "@/components/ScoreBars";
import FavoriteButton from "@/components/FavoriteButton";
import PlaceSaveButton from "@/components/PlaceSaveButton";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function FavoritenPage() {
  if (!(await getUser())) redirect("/login?next=/favoriten");

  const [criteria, districts, favorites, weights, places] = await Promise.all([
    getCriteria(),
    getDistricts(),
    getFavoriteIds(),
    getSavedWeights(),
    getSavedPlaces(),
  ]);
  const query = weights ? weightsToQuery(weights) : "";
  const favs = districts
    .filter((d) => favorites.has(d.id))
    .map((d) => ({ ...d, match: weights ? matchScore(d, weights) : null }))
    .sort((a, b) => (b.match ?? 0) - (a.match ?? 0));

  const empty = favs.length === 0 && places.length === 0;

  return (
    <div className="pt-2">
      <h1 className="mega text-[2.1rem]">Gemerkt</h1>
      <p className="mt-1 text-muted">Deine Kieze und Unterkünfte an einem Ort.</p>

      {empty && (
        <div className="mt-8 rounded-3xl border border-dashed border-raised p-8 text-center">
          <Icon name="map" size={48} className="mx-auto text-sun" />
          <p className="mt-2 font-semibold">Noch nichts gemerkt</p>
          <p className="mt-1 text-sm text-muted">Tippe bei einem Kiez oder Hotel auf das Herz.</p>
          <Link href="/" className="btn-chunky mt-5 w-full">
            Los geht&apos;s
          </Link>
        </div>
      )}

      {places.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-[19px] font-extrabold">
            <Icon name="hotel" size={24} className="text-sun" /> Unterkünfte
          </h2>
          <ul className="mt-3 space-y-2">
            {places.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-paper p-3">
                <Link
                  href={`/check/ergebnis?${new URLSearchParams({
                    lat: String(p.lat),
                    lon: String(p.lon),
                    name: p.name,
                    sub: p.subtitle ?? "",
                    kind: p.kind,
                  })}${query ? `&${query}` : ""}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sun font-display font-extrabold text-white">
                    {p.match ?? "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-sm text-muted">{p.subtitle}</span>
                  </span>
                </Link>
                <PlaceSaveButton
                  compact
                  place={{ name: p.name, subtitle: p.subtitle ?? "", lat: p.lat, lon: p.lon, kind: p.kind }}
                  initiallySaved
                  loggedIn
                  returnTo="/favoriten"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {favs.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-display text-[19px] font-extrabold">
            <Icon name="discover" size={24} className="text-sun" /> Kieze
          </h2>
          <ul className="mt-3 space-y-4">
            {favs.map((d) => (
              <li key={d.id} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-[22px] font-extrabold">{d.name}</h3>
                  {d.match !== null && (
                    <span className="rounded-2xl bg-sun px-3 py-1 font-display text-lg font-extrabold text-white">{d.match}%</span>
                  )}
                </div>
                <p className="mb-4 mt-1 text-sm text-muted">{d.short_description}</p>
                <ScoreBars criteria={criteria} scores={d.scores} />
                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/kiez/${d.slug}${query ? `?${query}` : ""}`} className="flex items-center gap-1 text-sm font-bold text-sun">
                    <Icon name="hotel" size={18} /> Hotels finden
                  </Link>
                  <FavoriteButton districtId={d.id} isFavorite />
                </div>
              </li>
            ))}
          </ul>
          {favs.length >= 2 && (
            <Link href={`/duell?a=${favs[0].slug}&b=${favs[1].slug}${query ? `&${query}` : ""}`} className="btn-chunky mt-6 w-full">
              <Icon name="duel" size={22} fill="#ffffff55" /> Kieze ins Duell schicken
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
