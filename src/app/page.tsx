import { VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { getChosenCity, getChosenZiel, getCities, getCriteria, getDistricts, getProfile, getUser } from "@/lib/data";
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
import { cityDataQuick, DEFAULT_WEIGHTS } from "@/lib/geo";
import { findSpots, pickZones } from "@/lib/zones";
import { redirect } from "next/navigation";
import { zielQuery } from "@/lib/ziel";

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
        <span className="text-base font-bold">StayCheck</span>
      )}
      <Link href="/check" aria-label="Lage-Check" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="search" size={20} />
      </Link>
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
  const { weights } = await getProfile(criteria);
  const [districts, cd] = await Promise.all([getDistricts(city.slug), cityDataQuick(city.lat, city.lng, VERIFIED_RADIUS)]);
  const w = weights ?? DEFAULT_WEIGHTS;
  const zones = cd ? pickZones(cd.zones, w) : [];
  // Kleine Ecken statt ganzer Bezirke (sobald das Raster der Stadt berechnet ist)
  const spots = cd ? findSpots(cd.zones, w, cd.places, cd.step) : [];
  const spotHref = (sp: (typeof spots)[number]) =>
    `/ziel/viertel?${zielQuery({ ort: city.name, land: city.country, lat: Number(city.lat.toFixed(4)), lon: Number(city.lng.toFixed(4)) })}&${new URLSearchParams({ name: sp.name, vlat: sp.lat.toFixed(5), vlon: sp.lon.toFixed(5), rad: String(VERIFIED_RADIUS) })}`;
  const topSpot = weights && spots[0] ? spots[0] : null;
  const ranked = weights ? rankDistricts(districts, weights) : null;
  const top = ranked?.[0] ?? null;
  const tipDistrict = top ?? districts[0];
  const tip = tipDistrict ? (await getTipsForDistrict(tipDistrict.id).catch(() => []))[0] : undefined;
  const tipCat = tip ? TIP_CATEGORIES.find((c) => c.key === tip.category) : undefined;

  return (
    <div className="fade-up">
      {header}

      <p className="mt-7 text-[13px] font-extrabold text-sun-soft">Deine Reise · {city.country}</p>
      <h1 className="mega mt-1 text-[clamp(2.2rem,10vw,2.7rem)]">Wo schläfst du in {city.name}?</h1>

      <Link
        href={topSpot ? spotHref(topSpot) : top ? `/kiez/${top.slug}?stadt=${city.slug}` : `/quiz?stadt=${city.slug}`}
        className="press glow-card mt-6 flex items-center gap-3.5 rounded-[18px] px-3.5 py-3.5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
          <Icon name="discover" size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">
            {topSpot
              ? `Deine Ecke: ${topSpot.name} · ${topSpot.match} %`
              : top
                ? `Dein Viertel: ${top.name.split(" (")[0]} · ${top.match} %`
                : "Welches Viertel passt zu mir?"}
          </span>
          <span className="block text-[13px] text-muted">
            {topSpot
              ? `${topSpot.area ? `In ${topSpot.area} · ` : ""}passt am besten zu deinem Reise-Profil`
              : top
                ? "Passt am besten zu deinem Reise-Profil"
                : "7 kurze Fragen, dann zeigen wir dir dein Viertel"}
          </span>
        </span>
        <Icon name="chevron" size={16} className="text-faint" />
      </Link>
      {top && (
        <div className="mt-2.5 flex items-center justify-center gap-4 text-[13px] font-semibold text-muted">
          <Link href="/profil" className="flex items-center gap-1.5">
            <Icon name="sliders" size={14} /> Reise-Profil ändern
          </Link>
          <span className="text-faint">·</span>
          <Link href={`/quiz?stadt=${city.slug}`} className="flex items-center gap-1.5">
            <Icon name="refresh" size={14} /> Quiz neu machen
          </Link>
        </div>
      )}

      {spots.length > 0 ? (
        <>
          <section className="mt-7">
            <h2 className="font-display text-[19px] font-extrabold">{weights ? "Deine besten Ecken" : `Die besten Ecken in ${city.name}`}</h2>
            <p className="mb-3 mt-1 text-[13px] text-muted">Kleine Gegenden statt ganzer Bezirke, genau dort, wo es passt.</p>
            <div className="mb-4">
              <KiezMap
                points={spots.map((sp) => ({ slug: sp.slug, name: sp.name, lat: sp.lat, lng: sp.lon, match: sp.match, label: sp.name }))}
                highlight={topSpot?.slug}
                center={[city.lng, city.lat]}
                zoom={city.zoom}
                height="h-60"
                zones={zones}
                fit
              />
              <ZoneLegend personal={Boolean(weights)} shown={zones.length > 0} />
            </div>
            <DistrictExplorer
              variant="cards"
              districts={spots.map((sp) => ({
                slug: sp.slug,
                city: city.slug,
                name: sp.name,
                short: sp.area ? `In ${sp.area}` : "",
                scores: sp.scores,
                match: weights ? sp.match : undefined,
                href: spotHref(sp),
              }))}
            />
          </section>
          <details className="group mt-7">
            <summary className="press flex cursor-pointer list-none items-center gap-3 rounded-[18px] bg-paper px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <Icon name="map" size={20} className="text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{`Alle ${(ranked ?? districts).length} Bezirke ansehen`}</span>
                <span className="block text-[13px] text-muted">Die ganze Stadt in größeren Stücken</span>
              </span>
              <Icon name="chevron" size={16} className="text-faint transition-transform group-open:rotate-90" />
            </summary>
            <p className="mb-1 mt-3 px-1 text-[13px] text-muted">Von uns bewertet, mit Sicherheit und Tipps von Reisenden.</p>
            <DistrictExplorer
              variant="list"
              filters={false}
              districts={(ranked ?? districts).map((d) => ({
                slug: d.slug,
                city: d.city,
                name: d.name,
                short: d.short_description,
                scores: d.scores,
                match: "match" in d ? (d as { match: number }).match : undefined,
              }))}
            />
          </details>
        </>
      ) : (
        <section className="mt-7">
        <h2 className="mb-3 font-display text-[19px] font-extrabold">{top ? "Alle Viertel für dich" : "Oder selbst stöbern"}</h2>
        <div className="mb-4">
          <KiezMap
            points={(ranked ?? districts)
              .filter((d) => d.lat !== null && d.lng !== null)
              .map((d) => ({
                slug: d.slug,
                name: d.name,
                lat: d.lat as number,
                lng: d.lng as number,
                match: "match" in d ? (d as { match: number }).match : 0,
                label: d.name.split(" (")[0].split(" /")[0],
              }))}
            highlight={top?.slug}
            center={[city.lng, city.lat]}
            zoom={city.zoom}
            height="h-60"
            zones={zones}
            fit
          />
          <ZoneLegend personal={Boolean(weights)} shown={zones.length > 0} />
        </div>
        <DistrictExplorer
          variant="cards"
          districts={(ranked ?? districts).map((d) => ({
            slug: d.slug,
            city: d.city,
            name: d.name,
            short: d.short_description,
            scores: d.scores,
            match: "match" in d ? (d as { match: number }).match : undefined,
          }))}
        />
      </section>
      )}

      <RecentChecks />

      {tip && tipDistrict && (
        <section className="mt-7">
          <h2 className="mb-3 font-display text-[19px] font-extrabold">Tipp von Reisenden</h2>
          <Link href={`/kiez/${tipDistrict.slug}?stadt=${city.slug}`} className="press block rounded-[18px] bg-paper px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
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
