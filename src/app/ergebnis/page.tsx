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
import ShareButton from "@/components/ShareButton";
import SaveButton from "@/components/SaveButton";

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
    <div className="fade-up space-y-7">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Start" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
          <Icon name="back" size={18} />
        </Link>
        <Link href="/reise" className="press flex items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold">
          {city.name} <Icon name="down" size={14} />
        </Link>
        <Link href="/profil" aria-label="Profil anpassen" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
          <Icon name="sliders" size={18} />
        </Link>
      </div>

      <section>
        <Reveal
          name={top.name.split(" (")[0]}
          match={top.match}
          celebrate={params.neu === "1"}
          eyebrow={`Dein Viertel in ${city.name}`}
          caption="Prozent Match"
          sub={top.short_description ?? undefined}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {reasons.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1.5 text-sm font-bold text-peach-ink">
              <Icon name={CRITERION_ICON[k]} size={16} /> {labelOf[k]}
            </span>
          ))}
        </div>
      </section>

      <div className="space-y-2.5">
        <Link href={`/kiez/${top.slug}${q("?")}`} className="btn-chunky w-full">
          Unterkünfte in {top.name.split(" (")[0]}
        </Link>
        <div className="grid grid-cols-2 gap-2.5">
          <ShareButton name={top.name} match={top.match} tags={reasons.map((k) => labelOf[k])} city={city.name} light />
          <Link
            href={`/duell?stadt=${city.slug}&a=${top.slug}&b=${rest[0]?.slug ?? top.slug}${q("&")}`}
            className="press flex items-center justify-center gap-2 rounded-full bg-tan py-4 font-bold"
          >
            <Icon name="duel" size={18} /> Duell
          </Link>
        </div>
        <SaveButton
          loggedIn={Boolean(user)}
          weights={weights}
          districtId={top.id}
          alreadySaved={favorites.has(top.id)}
          returnTo={`/ergebnis?stadt=${city.slug}${q("&")}`}
        />
      </div>

      <section>
        <h2 className="mb-3 font-display text-[19px] font-extrabold">Alle Viertel in {city.name}</h2>
        <KiezMap points={points} highlight={top.slug} center={[city.lng, city.lat]} zoom={city.zoom} height="h-72" />
        <ol className="mt-2">
          {ranked.map((d, i) => (
            <li key={d.id} id={`kiez-${d.slug}`} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
              <span className="w-5 shrink-0 font-bold text-faint">{i + 1}</span>
              <Link href={`/kiez/${d.slug}${q("?")}`} className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{d.name}</span>
                <span className="block truncate text-[13px] text-muted">
                  {topReasons(d, weights, 2).map((k) => labelOf[k]).join(" · ")}
                </span>
              </Link>
              <span className="w-12 text-right font-display text-[17px] font-extrabold tabular-nums text-sun-soft">{d.match}%</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
