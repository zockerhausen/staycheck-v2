import BackButton from "@/components/BackButton";
import { VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCity,
  getCriteria,
  getDistricts,
  getExtras,
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
import DistrictExplorer from "@/components/DistrictExplorer";
import ZoneLegend from "@/components/ZoneLegend";
import { cityDataQuick, DEFAULT_WEIGHTS } from "@/lib/geo";
import { bestSpotsIn, spotGlow } from "@/lib/zones";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Zonen einer Stadt dürfen beim ersten Mal im Hintergrund fertig rechnen

export default async function ErgebnisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const wanted = typeof params.stadt === "string" ? params.stadt : await getLastCity();
  const city = (await getCity(wanted)) ?? (await getCity("berlin"));
  if (!city) redirect("/reise");
  const [criteria, districts, favorites, user, extras] = await Promise.all([
    getCriteria(),
    getDistricts(city.slug),
    getFavoriteIds(),
    getUser(),
    getExtras(),
  ]);

  const { weights, source } = await resolveWeights(params, criteria);
  // Bester Spot in jedem Viertel: nur diese kleinen Stellen leuchten auf der Karte
  const cd = await cityDataQuick(city.lat, city.lng, VERIFIED_RADIUS);
  const located = districts.filter((d) => d.lat !== null && d.lng !== null).map((d) => ({ slug: d.slug, lat: d.lat as number, lon: d.lng as number }));
  const bestSpots = cd ? bestSpotsIn(cd.zones, weights ?? DEFAULT_WEIGHTS, located, cd.places, cd.step, weights ? extras.nogo : undefined) : new Map();
  const zones = spotGlow([...bestSpots.values()]);
  const explorer = (list: typeof districts, withMatch?: Record<string, number>) =>
    list.map((d) => {
      const sp = bestSpots.get(d.slug);
      return { slug: d.slug, city: d.city, name: d.name, short: d.short_description, scores: d.scores, match: withMatch?.[d.slug], spot: sp ? { name: sp.name } : undefined };
    });

  // Ohne Reise-Profil: Viertel frei entdecken (nach Eigenschaften), Quiz als Angebot
  if (!weights) {
    const pts = districts
      .filter((d) => d.lat !== null && d.lng !== null)
      .map((d) => ({ slug: d.slug, name: d.name, lat: d.lat as number, lng: d.lng as number, match: 0, label: d.name.split(" (")[0].split(" /")[0] }));
    return (
      <div className="fade-up space-y-6">
        <div className="flex items-center justify-between">
          <BackButton fallback="/" className="press flex h-11 w-11 items-center justify-center rounded-full glass border border-[var(--sc-glass-line)] shadow-soft">
            <Icon name="back" size={18} />
          </BackButton>
          <Link href="/reise" className="press flex items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold">
            {city.name} <Icon name="down" size={14} />
          </Link>
          <span className="h-11 w-11" />
        </div>
        <div>
          <h1 className="mega text-[2.1rem]">Viertel in {city.name}</h1>
          <p className="mt-2 text-muted">Jedes Viertel hat seinen eigenen Charakter. Filter nach dem, was dir wichtig ist.</p>
        </div>
        <Link href={`/quiz?stadt=${city.slug}`} className="press glow-card flex items-center gap-3.5 rounded-[18px] px-3.5 py-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
            <Icon name="discover" size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Welches passt zu mir?</span>
            <span className="block text-[13px] text-muted">Kurzes Quiz (1 Minute), dann zeigen wir dir dein Viertel</span>
          </span>
          <Icon name="chevron" size={16} className="text-faint" />
        </Link>
        <div>
          <KiezMap points={pts} center={[city.lng, city.lat]} zoom={city.zoom} height="h-64" zones={zones} />
          <ZoneLegend personal={false} shown={zones.length > 0} perDistrict />
        </div>
        <DistrictExplorer variant="list" districts={explorer(districts)} />
      </div>
    );
  }

  const ranked = rankDistricts(districts, weights, extras.nogo);
  const [top, ...rest] = ranked;
  if (!top) redirect("/");

  const labelOf = Object.fromEntries(criteria.map((c) => [c.key, c.label]));
  // Gewichte nur in Links mitgeben, wenn sie aus der URL kamen – sonst gilt immer das aktuelle Profil
  const query = source === "url" ? weightsToQuery(weights) : "";
  const q = (sep: "?" | "&") => (query ? `${sep}${query}` : "");
  const reasons = topReasons(top, weights, 3);
  // Die Zahl des Viertels sitzt an seinem besten Spot (dort lohnt es sich zu suchen); ohne Spot: in der Mitte
  const points = ranked
    .filter((d) => d.lat !== null && d.lng !== null)
    .map((d) => {
      const sp = bestSpots.get(d.slug);
      return { slug: d.slug, name: d.name, lat: sp?.lat ?? (d.lat as number), lng: sp?.lon ?? (d.lng as number), match: d.match };
    });

  return (
    <div className="fade-up space-y-7">
      <div className="flex items-center justify-between">
        <BackButton fallback="/" className="press flex h-11 w-11 items-center justify-center rounded-full glass border border-[var(--sc-glass-line)] shadow-soft">
          <Icon name="back" size={18} />
        </BackButton>
        <Link href="/reise" className="press flex items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold">
          {city.name} <Icon name="down" size={14} />
        </Link>
        <Link href="/profil" aria-label="Profil anpassen" className="press flex h-11 w-11 items-center justify-center rounded-full glass border border-[var(--sc-glass-line)] shadow-soft">
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
        <KiezMap points={points} highlight={top.slug} center={[city.lng, city.lat]} zoom={city.zoom} height="h-72" zones={zones} />
        <ZoneLegend personal shown={zones.length > 0} perDistrict />
        <div className="mt-4">
          <DistrictExplorer variant="list" districts={explorer(ranked, Object.fromEntries(ranked.map((d) => [d.slug, d.match])))} query={query} />
        </div>
      </section>
    </div>
  );
}
