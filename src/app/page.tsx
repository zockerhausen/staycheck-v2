import { VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { getChosenCity, getChosenZiel, getCities, getCriteria, getDistricts, getExtras, getProfile, getUser } from "@/lib/data";
import { rankDistricts } from "@/lib/matching";
import { getTipsForDistrict, TIP_CATEGORIES } from "@/lib/tips";
import Icon from "@/components/Icon";
import RecentChecks from "@/components/RecentChecks";
import DistrictExplorer from "@/components/DistrictExplorer";
import DestinationSearch from "@/components/DestinationSearch";
import LegalLinks from "@/components/LegalLinks";
import CitySwitcher from "@/components/CitySwitcher";
import KiezMap from "@/components/KiezMap";
import ZoneLegend from "@/components/ZoneLegend";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileBar from "@/components/ProfileBar";
import { cityDataQuick, DEFAULT_WEIGHTS } from "@/lib/geo";
import { findSpots, pickZones } from "@/lib/zones";
import { redirect } from "next/navigation";
import { zielQuery } from "@/lib/ziel";
import { areaPhotos } from "@/lib/photos";
import { after } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Zonen dürfen beim ersten Mal im Hintergrund fertig rechnen

/**
 * Start aus Sicht von Reisenden, die einen Trip planen:
 * 1) Wohin geht die Reise?  2) Dort: Viertel finden (Quiz) oder stöbern. Lage-Check gebuchter Unterkünfte: eigener Reiter unten.
 */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [criteria, cities, chosen, user] = await Promise.all([getCriteria(), getCities(), getChosenCity(), getUser()]);
  const ready = cities.filter((c) => c.districtCount > 0);
  const fromUrl = typeof params.ziel === "string" ? params.ziel : null;
  const wantsPicker = fromUrl === "neu";
  const city = wantsPicker ? undefined : ready.find((c) => c.slug === (fromUrl ?? chosen));
  const verified = ready.map((c) => ({ slug: c.slug, name: c.name, country: c.country }));

  // Zuletzt gewähltes Reiseziel ohne Handbewertung (z. B. Lissabon)? Dann direkt dorthin.
  if (!city && !wantsPicker && !fromUrl) {
    const ziel = await getChosenZiel();
    if (ziel) redirect(`/ziel?${zielQuery(ziel)}`);
  }

  const header = (
    <div className="flex items-center justify-between">
      <Link href={user ? "/konto" : "/login"} aria-label="Konto" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="user" size={20} />
      </Link>
      {city ? (
        <CitySwitcher current={city.name} verified={verified} />
      ) : (
        <span className="text-[17px] font-black">StayCheck</span>
      )}
      <ThemeToggle className="h-11 w-11" />
    </div>
  );

  // Schritt 1: Noch kein Reiseziel gewählt
  if (!city) {
    return (
      <div className="fade-up">
        {header}
        <h1 className="mega mt-7 text-[clamp(2.4rem,11vw,2.9rem)]">
          Wohin geht
          <br />
          deine Reise?
        </h1>
        <p className="mt-3 leading-relaxed text-muted">Egal welche Stadt: Wir zeigen dir, welches Viertel zu dir passt und wo du am besten schläfst.</p>

        <div className="mt-6">
          <DestinationSearch verified={verified} />
        </div>

        {params.geloescht === "1" && (
          <p className="mt-5 rounded-2xl bg-tan p-3.5 text-sm" role="status">
            Dein Konto und alle Daten dazu sind gelöscht.
          </p>
        )}

        <RecentChecks />
        <LegalLinks className="mt-12" />
      </div>
    );
  }

  // Schritt 2: Reiseziel gewählt
  const [{ weights }, extras] = await Promise.all([getProfile(criteria), getExtras()]);
  const [districts, cd] = await Promise.all([getDistricts(city.slug), cityDataQuick(city.lat, city.lng, VERIFIED_RADIUS)]);
  const w = weights ?? DEFAULT_WEIGHTS;
  const zones = cd ? pickZones(cd.zones, w) : [];
  // Kleine Ecken statt ganzer Bezirke (sobald das Raster der Stadt berechnet ist)
  const spots = cd ? findSpots(cd.zones, w, cd.places, cd.step) : [];
  const spotHref = (sp: (typeof spots)[number]) =>
    `/ziel/viertel?${zielQuery({ ort: city.name, land: city.country, lat: Number(city.lat.toFixed(4)), lon: Number(city.lng.toFixed(4)) })}&${new URLSearchParams({ name: sp.name, vlat: sp.lat.toFixed(5), vlon: sp.lon.toFixed(5), rad: String(VERIFIED_RADIUS) })}`;
  const topSpot = weights && spots[0] ? spots[0] : null;
  // Fotos der Ecken (Wikipedia/Wikimedia), höchstens kurz warten, Rest lädt im Hintergrund
  const { photos, rest: photosRest } = await areaPhotos(
    spots.slice(0, 12).map((sp) => ({ key: sp.slug, name: sp.name, lat: sp.lat, lon: sp.lon })),
    city.name,
  );
  after(() => photosRest);
  const ranked = weights ? rankDistricts(districts, weights) : null;
  const top = ranked?.[0] ?? null;
  const tipDistrict = top ?? districts[0];
  const tip = tipDistrict ? (await getTipsForDistrict(tipDistrict.id).catch(() => []))[0] : undefined;
  const tipCat = tip ? TIP_CATEGORIES.find((c) => c.key === tip.category) : undefined;

  const allDistricts = (ranked ?? districts).map((d) => ({
    slug: d.slug,
    city: d.city,
    name: d.name,
    short: d.short_description,
    scores: d.scores,
    match: "match" in d ? (d as { match: number }).match : undefined,
  }));
  const mapPoints = spots.length
    ? spots.map((sp) => ({ slug: sp.slug, name: sp.name, lat: sp.lat, lng: sp.lon, match: sp.match, label: sp.name }))
    : (ranked ?? districts)
        .filter((d) => d.lat !== null && d.lng !== null)
        .map((d) => ({
          slug: d.slug,
          name: d.name,
          lat: d.lat as number,
          lng: d.lng as number,
          match: "match" in d ? (d as { match: number }).match : 0,
          label: d.name.split(" (")[0].split(" /")[0],
        }));

  return (
    <div className="fade-up">
      <div className="flex items-center gap-2.5">
        <CitySwitcher variant="bar" current={city.name} verified={verified} />
        <Link
          href={user ? "/konto" : "/login"}
          aria-label="Konto"
          className="press flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-line bg-sand shadow-soft"
        >
          <Icon name="user" size={21} fill="transparent" />
        </Link>
        <ThemeToggle className="h-[52px] w-[52px]" />
      </div>

      <ProfileBar weights={weights} extras={extras} quizHref={`/quiz?stadt=${city.slug}`} />

      <section id="karte" className="mt-6">
        <h1 className="mb-3 text-[26px] font-black leading-tight tracking-tight [overflow-wrap:anywhere]">Wo schläfst du in {city.name}?</h1>
      <KiezMap points={mapPoints} highlight={topSpot?.slug ?? top?.slug} center={[city.lng, city.lat]} zoom={city.zoom} height="h-80" zones={zones} fit />
        <ZoneLegend personal={Boolean(weights)} shown={zones.length > 0} />
      </section>

      <section className="mt-9">
        <h2 className="text-[24px] font-black leading-tight tracking-tight">
          {spots.length ? (weights ? "Deine besten Ecken" : `Die besten Ecken in ${city.name}`) : top ? "Alle Viertel für dich" : `Viertel in ${city.name}`}
        </h2>
        <p className="mb-4 mt-1 text-[15px] font-semibold text-muted">
          {spots.length ? "Kleine Gegenden statt ganzer Bezirke, genau dort, wo es passt." : "Von uns bewertet, mit Sicherheit und Tipps von Reisenden."}
        </p>
        <DistrictExplorer
          variant="feed"
          topLabel={weights ? "Passt am besten zu dir" : "Beste Lage"}
          districts={
            spots.length
              ? spots.map((sp) => ({
                  slug: sp.slug,
                  city: city.slug,
                  name: sp.name,
                  short: sp.area ? `In ${sp.area}` : "",
                  scores: sp.scores,
                  match: sp.match,
                  href: spotHref(sp),
                  photo: photos[sp.slug],
                }))
              : allDistricts
          }
        />
      </section>


      {spots.length > 0 && (
        <details className="group mt-8">
          <summary className="press flex cursor-pointer list-none items-center gap-3 rounded-[20px] bg-paper px-4 py-4 [&::-webkit-details-marker]:hidden">
            <Icon name="map" size={22} />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-black">{`Alle ${allDistricts.length} Bezirke ansehen`}</span>
              <span className="block text-[14px] font-semibold text-muted">Die ganze Stadt in größeren Stücken</span>
            </span>
            <Icon name="chevron" size={16} className="text-muted transition-transform group-open:rotate-90" />
          </summary>
          <p className="mb-1 mt-3 px-1 text-[14px] font-semibold text-muted">Von uns bewertet, mit Sicherheit und Tipps von Reisenden.</p>
          <DistrictExplorer variant="list" filters={false} districts={allDistricts} />
        </details>
      )}

      <RecentChecks />

      {tip && tipDistrict && (
        <section className="mt-7">
          <h2 className="mb-3 text-[20px] font-black tracking-tight">Tipp von Reisenden</h2>
          <Link href={`/kiez/${tipDistrict.slug}?stadt=${city.slug}`} className="press block rounded-[18px] bg-paper px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-muted">
              <Icon name={tipCat?.icon ?? "tip"} size={14} /> {tipCat?.label ?? "Tipp"} · {tipDistrict.name.split(" (")[0]}
            </span>
            <span className="mt-1.5 block text-[15px] leading-snug">{tip.body}</span>
          </Link>
        </section>
      )}
      <LegalLinks className="mt-12" />
    </div>
  );
}
