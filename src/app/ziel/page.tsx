import Link from "next/link";
import { redirect } from "next/navigation";
import { getCities, getCriteria, getExtras, getProfile, getUser } from "@/lib/data";
import { after } from "next/server";
import { autoCityCached, DEFAULT_WEIGHTS, distance, locationMatch, withDeadline, type AutoCity } from "@/lib/geo";
import { findSpots, pickZones } from "@/lib/zones";
import StillLoading from "@/components/StillLoading";
import { parseZiel, zielQuery } from "@/lib/ziel";
import { areaPhotos } from "@/lib/photos";
import { pageRateLimit } from "@/lib/ratelimit-page";
import Icon from "@/components/Icon";
import DistrictExplorer from "@/components/DistrictExplorer";
import KiezMap from "@/components/KiezMap";
import ProfileBar from "@/components/ProfileBar";
import HomePoster, { type PosterBest } from "@/components/HomePoster";
import { traitsOf } from "@/lib/character";
import MapStage from "@/components/MapStage";
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

  const verifiedList = cities.filter((c) => c.districtCount > 0).map((c) => ({ slug: c.slug, name: c.name, country: c.country }));
  const posterFor = (best: PosterBest | null, personal: boolean) => (
    <HomePoster
      city={ziel.ort}
      hint={ziel.land ? `${ziel.land}, wo willst du schlafen?` : "Wo willst du schlafen?"}
      verified={verifiedList}
      loggedIn={Boolean(user)}
      best={best}
      personal={personal}
    />
  );
  const header = posterFor(null, false);

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
  // Beste Ecke fürs Plakat oben (ohne Profil: beste Lage allgemein)
  const posterSpot = spots[0];
  const best: PosterBest | null = posterSpot
    ? {
        name: posterSpot.name,
        meta: [posterSpot.area ? `In ${posterSpot.area}` : "", traitsOf(posterSpot.scores, spots.map((x) => x.scores)).slice(0, 2).map((t) => t.label).join(", ")].filter(Boolean).join(" · "),
        score: posterSpot.match,
        href: spotHref(posterSpot),
      }
    : top && top.match !== undefined
      ? { name: top.name, meta: "", score: top.match, href: viertelHref(top) }
      : null;
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
      {posterFor(best, Boolean(weights))}
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

          <h1 className="mt-6 text-[22px] font-extrabold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere]">Wo schläfst du in {ziel.ort}?</h1>
          <MapStage id="karte">
            <KiezMap
            points={
              spots.length
                ? spots.map((sp) => ({ slug: sp.slug, name: sp.name, lat: sp.lat, lng: sp.lon, match: sp.match, label: sp.name }))
                : sorted.map((d) => ({ slug: d.slug, name: d.name, lat: d.lat, lng: d.lon, match: d.match ?? 0, label: d.name }))
            }
            highlight={topSpot?.slug}
            center={[ziel.lon, ziel.lat]}
            zoom={11.5}
            height="h-[420px]"
            zones={zones}
            fit
            flush
            legend={zones.length ? (weights ? "Violett = passt zu dir" : "Violett = beste Lage") : undefined}
          />
          </MapStage>

          {/* Liste als Blatt, das über die Karte geschoben ist: Karte und Ecken gehören sichtbar zusammen */}
          <section id="ecken" className="shadow-sheet relative z-[1] -mx-4 -mt-[30px] min-h-[70vh] scroll-mt-4 rounded-t-[32px] bg-sand px-5 pb-4 pt-2.5">
            <div className="mx-auto mb-4 h-[5px] w-[42px] rounded-full bg-line" />
            <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere]">
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


          {spots.length > 0 && (
            <details className="group mt-8">
              <summary className="press card flex cursor-pointer list-none items-center gap-3 !rounded-[24px] px-4 py-4 text-sun-soft [&::-webkit-details-marker]:hidden">
                <Icon name="map" size={22} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-extrabold text-ink">{`Alle ${sorted.length} Stadtteile ansehen`}</span>
                  <span className="block text-[14px] font-semibold text-muted">Die ganze Stadt in größeren Stücken</span>
                </span>
                <Icon name="chevron" size={16} className="text-muted transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-2">{districtList}</div>
            </details>
          )}
          </section>
        </>
      )}
      <div className="relative z-[1] -mx-4 bg-sand px-4">
        <LegalLinks className="pt-12" />
      </div>
    </div>
  );
}
