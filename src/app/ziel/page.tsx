import Link from "next/link";
import { redirect } from "next/navigation";
import { getCities, getCriteria, getExtras, getProfile, getUser } from "@/lib/data";
import { after } from "next/server";
import { autoCityCached, DEFAULT_WEIGHTS, distance, locationMatch, withDeadline, type AutoCity } from "@/lib/geo";
import { findSpots, pickZones } from "@/lib/zones";
import ZoneLegend from "@/components/ZoneLegend";
import StillLoading from "@/components/StillLoading";
import { parseZiel, zielQuery } from "@/lib/ziel";
import { areaPhotos } from "@/lib/photos";
import { pageRateLimit } from "@/lib/ratelimit-page";
import Icon from "@/components/Icon";
import DistrictExplorer from "@/components/DistrictExplorer";
import KiezMap from "@/components/KiezMap";
import CitySwitcher from "@/components/CitySwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileBar from "@/components/ProfileBar";
import LegalLinks from "@/components/LegalLinks";

// Kartendaten-Abfragen werden zwischengespeichert (1 Tag), die Seite selbst ist dynamisch.
export const fetchCache = "default-cache";
export const maxDuration = 120; // erste Berechnung einer Stadt kann dauern (läuft nach der Antwort weiter)

/** Reiseziel ohne unsere Handbewertung: Viertel automatisch aus OpenStreetMap. */
export default async function ZielPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ziel = parseZiel(params);
  if (!ziel) redirect("/?ziel=neu");

  // Geprüfte Stadt in der Nähe? Dann lieber unsere handbewerteten Viertel.
  const [cities, user] = await Promise.all([getCities(), getUser()]);
  const known = cities.find((c) => c.districtCount > 0 && distance(ziel.lat, ziel.lon, c.lat, c.lng) < 30_000);
  if (known) redirect(`/?ziel=${known.slug}`);

  const header = (
    <div className="flex items-center gap-2.5">
      <CitySwitcher
        variant="bar"
        current={ziel.ort}
        hint={ziel.land ? `${ziel.land}, wo willst du schlafen?` : "Wo willst du schlafen?"}
        verified={cities.filter((c) => c.districtCount > 0).map((c) => ({ slug: c.slug, name: c.name, country: c.country }))}
      />
      <Link
        href={user ? "/konto" : "/login"}
        aria-label="Konto"
        className="press flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-line bg-sand shadow-soft"
      >
        <Icon name="user" size={21} fill="transparent" />
      </Link>
      <ThemeToggle className="h-[52px] w-[52px]" />
    </div>
  );

  if (!(await pageRateLimit("ziel", 12))) {
    return (
      <div className="fade-up">
        {header}
        <p className="card mt-8 p-5 text-sm text-muted">Zu viele Anfragen in kurzer Zeit. Warte eine Minute und lade die Seite neu.</p>
      </div>
    );
  }

  const criteria = await getCriteria();
  const work = autoCityCached(ziel.lat, ziel.lon).catch(() => null as AutoCity | null);
  const [{ weights }, raced, extras] = await Promise.all([getProfile(criteria), withDeadline(work, 9_000), getExtras()]);
  // Erste Berechnung einer Stadt zu langsam? Im Hintergrund fertig rechnen, Seite lädt von selbst neu.
  if (raced === "slow") after(() => work);
  const slow = raced === "slow";
  const districts = slow ? [] : (raced?.districts ?? null);
  const zones = slow || !raced ? [] : pickZones(raced.zones, weights ?? DEFAULT_WEIGHTS);
  // Kleine Ecken statt ganzer Stadtteile
  const spots = slow || !raced ? [] : findSpots(raced.zones, weights ?? DEFAULT_WEIGHTS, raced.places, raced.step);
  const zq = zielQuery(ziel);
  const viertelHref = (d: AutoCity["districts"][number]) =>
    `/ziel/viertel?${zq}&${new URLSearchParams({ name: d.name.slice(0, 80), vlat: d.lat.toFixed(5), vlon: d.lon.toFixed(5) })}`;
  const list = (districts ?? []).map((d) => ({ ...d, match: weights ? locationMatch(d.scores, weights) : undefined }));
  const sorted = weights ? [...list].sort((a, b) => (b.match ?? 0) - (a.match ?? 0)) : list;
  const top = weights ? sorted[0] : undefined;
  const spotHref = (sp: (typeof spots)[number]) =>
    `/ziel/viertel?${zq}&${new URLSearchParams({ name: sp.name, vlat: sp.lat.toFixed(5), vlon: sp.lon.toFixed(5) })}`;
  const topSpot = weights && spots[0] ? spots[0] : null;
  // Fotos der Ecken (Wikipedia/Wikimedia), höchstens kurz warten, Rest lädt im Hintergrund
  const { photos, rest: photosRest } = await areaPhotos(
    spots.slice(0, 12).map((sp) => ({ key: sp.slug, name: sp.name, lat: sp.lat, lon: sp.lon })),
    ziel.ort,
  );
  after(() => photosRest);
  const districtList = (
    <>
      <DistrictExplorer
        variant={spots.length ? "list" : "feed"}
        filters={!spots.length}
        districts={sorted.map((d) => ({
          slug: d.slug,
          city: "",
          name: d.name,
          short: d.distKm < 1.5 ? "Im Zentrum" : `${String(d.distKm).replace(".", ",")} km vom Zentrum`,
          scores: d.scores,
          match: d.match,
          href: viertelHref(d),
        }))}
      />
      <p className="mt-3 flex items-start gap-2 px-1 text-[13px] font-semibold leading-relaxed text-muted">
        <Icon name="flag" size={14} className="mt-0.5 shrink-0" />
        <span>
          Automatisch aus OpenStreetMap berechnet, gröber als bei geprüften Städten. Sicherheit kennen wir hier noch nicht.{" "}
          <Link href="/methode" className="font-semibold text-sun-soft underline underline-offset-4">
            So rechnen wir
          </Link>
        </span>
      </p>
    </>
  );

  return (
    <div className="fade-up">
      {header}
      {slow ? (
        <StillLoading
          title={`Wir erkunden ${ziel.ort} …`}
          text="Beim ersten Mal zählen wir für jedes Viertel Bahn, Bars, Essen und Parks. Das dauert etwas, die Seite lädt von selbst neu."
        />
      ) : districts === null ? (
        <div className="card mt-6 p-5">
          <p className="font-bold">Die Kartendaten sind gerade überlastet.</p>
          <p className="mt-1 text-sm text-muted">Lade die Seite in einer Minute neu. Den Lage-Check für eine Unterkunft kannst du schon nutzen.</p>
        </div>
      ) : districts.length === 0 ? (
        <div className="card mt-6 p-5">
          <p className="font-bold">Für {ziel.ort} kennt die Karte keine Stadtteile.</p>
          <p className="mt-1 text-sm text-muted">Das ist bei kleineren Orten normal. Prüf einfach direkt die Lage deiner Unterkunft.</p>
        </div>
      ) : (
        <>
          <ProfileBar weights={weights} extras={extras} quizHref={`/quiz?${zq}`} />

          <section id="karte" className="mt-6">
            <h1 className="mb-3 text-[26px] font-black leading-tight tracking-tight [overflow-wrap:anywhere]">Wo schläfst du in {ziel.ort}?</h1>
          <KiezMap
            points={
              spots.length
                ? spots.map((sp) => ({ slug: sp.slug, name: sp.name, lat: sp.lat, lng: sp.lon, match: sp.match, label: sp.name }))
                : sorted.map((d) => ({ slug: d.slug, name: d.name, lat: d.lat, lng: d.lon, match: d.match ?? 0, label: d.name }))
            }
            highlight={topSpot?.slug}
            center={[ziel.lon, ziel.lat]}
            zoom={11.5}
            height="h-80"
            zones={zones}
            fit
          />
            <ZoneLegend personal={Boolean(weights)} shown={zones.length > 0} />
          </section>

          <section className="mt-9">
            <h2 className="text-[24px] font-black leading-tight tracking-tight [overflow-wrap:anywhere]">
              {spots.length ? (weights ? "Deine besten Ecken" : `Die besten Ecken in ${ziel.ort}`) : top ? "Alle Viertel für dich" : `Viertel in ${ziel.ort}`}
            </h2>
            <p className="mb-4 mt-1 text-[15px] font-semibold text-muted">
              {spots.length ? "Kleine Gegenden statt ganzer Stadtteile, genau dort, wo es passt." : "Automatisch aus OpenStreetMap berechnet."}
            </p>
            {spots.length > 0 ? (
              <DistrictExplorer
                variant="feed"
                topLabel={weights ? "Passt am besten zu dir" : "Beste Lage"}
                districts={spots.map((sp) => ({
                  slug: sp.slug,
                  city: "",
                  name: sp.name,
                  short: sp.area ? `In ${sp.area}` : "",
                  scores: sp.scores,
                  match: sp.match,
                  href: spotHref(sp),
                  photo: photos[sp.slug],
                }))}
              />
            ) : (
              districtList
            )}
          </section>


          {spots.length > 0 && (
            <details className="group mt-8">
              <summary className="press flex cursor-pointer list-none items-center gap-3 rounded-[20px] bg-paper px-4 py-4 [&::-webkit-details-marker]:hidden">
                <Icon name="map" size={22} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-black">{`Alle ${sorted.length} Stadtteile ansehen`}</span>
                  <span className="block text-[14px] font-semibold text-muted">Die ganze Stadt in größeren Stücken</span>
                </span>
                <Icon name="chevron" size={16} className="text-muted transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-2">{districtList}</div>
            </details>
          )}
        </>
      )}
      <LegalLinks className="mt-12" />
    </div>
  );
}
