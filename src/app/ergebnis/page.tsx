import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCity,
  getCriteria,
  getDistricts,
  getFavoriteIds,
  getLastCity,
  getUser,
  resolveWeights,
  weightsToQuery,
} from "@/lib/data";
import { rankDistricts, topReasons } from "@/lib/matching";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
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
  const wanted = typeof params.stadt === "string" ? params.stadt : await getLastCity();
  const city = (await getCity(wanted)) ?? (await getCity("berlin"));
  if (!city) redirect("/reise");
  const [criteria, districts, favorites, user] = await Promise.all([
    getCriteria(),
    getDistricts(city.slug),
    getFavoriteIds(),
    getUser(),
  ]);

  const { weights, source } = await resolveWeights(params, criteria);
  if (!weights) redirect(`/quiz?stadt=${city.slug}`);

  const ranked = rankDistricts(districts, weights);
  const [top, ...rest] = ranked;
  if (!top) redirect("/");

  const labelOf = Object.fromEntries(criteria.map((c) => [c.key, c.label]));
  // Gewichte nur in Links mitgeben, wenn sie aus der URL kamen – sonst gilt immer das aktuelle Profil
  const query = source === "url" ? weightsToQuery(weights) : "";
  const q = (sep: "?" | "&") => (query ? `${sep}${query}` : "");
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
        <div className="flex items-center gap-4">
          <Link href="/reise" className="flex items-center gap-1 text-sm font-semibold text-muted">
            <Icon name="map" size={18} /> Stadt
          </Link>
          <Link href="/profil" className="flex items-center gap-1 text-sm font-semibold text-muted">
            <Icon name="user" size={18} /> Profil
          </Link>
        </div>
      </div>

      <section>
        <Reveal name={top.name} match={top.match} celebrate={params.neu === "1"} eyebrow={`Dein Kiez in ${city.name}`} />
        <div className="mt-4 flex flex-wrap gap-2">
          {reasons.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1.5 text-sm font-semibold text-peach-ink">
              <Icon name={CRITERION_ICON[k]} size={18} fill="#fff" /> {labelOf[k]}
            </span>
          ))}
        </div>
        <p className="mt-3 text-muted">{top.short_description}</p>
      </section>

      <div className="space-y-3">
        <Link href={`/kiez/${top.slug}${q("?")}`} className="btn-chunky w-full">
          <Icon name="hotel" size={22} fill="#ffffff55" /> Hotels in {top.name} finden
        </Link>
        <ShareButton name={top.name} match={top.match} tags={reasons.map((k) => labelOf[k])} city={city.name} light />
        <SaveButton
          loggedIn={Boolean(user)}
          weights={weights}
          districtId={top.id}
          alreadySaved={favorites.has(top.id)}
          returnTo={`/ergebnis?stadt=${city.slug}${q("&")}`}
        />
      </div>

      <section>
        <h2 className="font-display text-xl font-bold">Alle Kieze auf der Karte</h2>
        <p className="mb-3 text-sm text-muted">Die Zahl ist dein Match. Tipp auf einen Punkt.</p>
        <KiezMap points={points} highlight={top.slug} center={[city.lng, city.lat]} zoom={city.zoom} />
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Weitere Kieze für dich</h2>
        <p className="mb-3 text-sm text-muted">Wisch zur Seite</p>
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
                <div className="flex items-center gap-4">
                  <Link href={`/kiez/${d.slug}${q("?")}`} className="flex items-center gap-1 text-sm font-bold text-sun">
                    <Icon name="hotel" size={18} /> Hotels
                  </Link>
                  <Link
                    href={`/duell?stadt=${city.slug}&a=${top.slug === d.slug ? d.slug : top.slug}&b=${top.slug === d.slug ? rest[0]?.slug ?? d.slug : d.slug}${q("&")}`}
                    className="flex items-center gap-1 text-sm font-bold text-muted"
                  >
                    <Icon name="duel" size={18} /> Duell
                  </Link>
                </div>
                {user && <FavoriteButton districtId={d.id} isFavorite={favorites.has(d.id)} />}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
