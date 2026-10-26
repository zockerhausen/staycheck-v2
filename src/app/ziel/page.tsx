import Link from "next/link";
import { redirect } from "next/navigation";
import { getCities, getCriteria, getProfile, getUser } from "@/lib/data";
import { after } from "next/server";
import { autoCityCached, DEFAULT_WEIGHTS, distance, locationMatch, withDeadline, type AutoCity } from "@/lib/geo";
import { findSpots, pickZones } from "@/lib/zones";
import ZoneLegend from "@/components/ZoneLegend";
import StillLoading from "@/components/StillLoading";
import { parseZiel, zielQuery } from "@/lib/ziel";
import { pageRateLimit } from "@/lib/ratelimit-page";
import Icon from "@/components/Icon";
import DistrictExplorer from "@/components/DistrictExplorer";
import KiezMap from "@/components/KiezMap";
import CitySwitcher from "@/components/CitySwitcher";

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
    <div className="flex items-center justify-between">
      <Link href={user ? "/konto" : "/login"} aria-label="Konto" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="user" size={20} />
      </Link>
      <CitySwitcher
        current={ziel.ort}
        verified={cities.filter((c) => c.districtCount > 0).map((c) => ({ slug: c.slug, name: c.name, country: c.country }))}
      />
      <Link href="/check" aria-label="Lage-Check" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="search" size={20} />
      </Link>
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
  const [{ weights }, raced] = await Promise.all([getProfile(criteria), withDeadline(work, 9_000)]);
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
  const districtList = (
    <>
      <DistrictExplorer
        variant={spots.length ? "list" : "cards"}
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
      <p className="mt-3 flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
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
      <p className="mt-7 text-[13px] font-extrabold text-sun-soft">Deine Reise{ziel.land ? ` · ${ziel.land}` : ""}</p>
      <h1 className="mega mt-1 text-[clamp(2.2rem,10vw,2.7rem)] [overflow-wrap:anywhere]">Wo schläfst du in {ziel.ort}?</h1>

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
          <Link
            href={topSpot ? spotHref(topSpot) : top ? viertelHref(top) : `/quiz?${zq}`}
            className="press glow-card mt-6 flex items-center gap-3.5 rounded-[18px] px-3.5 py-3.5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
              <Icon name="discover" size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">
                {topSpot ? `Deine Ecke: ${topSpot.name} · ${topSpot.match} %` : top ? `Dein Viertel: ${top.name} · ${top.match} %` : "Welches Viertel passt zu mir?"}
              </span>
              <span className="block text-[13px] text-muted">
                {top ? "Passt am besten zu deinem Reise-Profil" : "7 kurze Fragen, dann zeigen wir dir dein Viertel"}
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
              <Link href={`/quiz?${zq}`} className="flex items-center gap-1.5">
                <Icon name="refresh" size={14} /> Quiz neu machen
              </Link>
            </div>
          )}

          {spots.length > 0 && (
            <section className="mt-7">
              <h2 className="font-display text-[19px] font-extrabold">{weights ? "Deine besten Ecken" : `Die besten Ecken in ${ziel.ort}`}</h2>
              <p className="mb-3 mt-1 text-[13px] text-muted">Kleine Gegenden statt ganzer Stadtteile, genau dort, wo es passt.</p>
              <div className="mb-4">
                <KiezMap
                  points={spots.map((sp) => ({ slug: sp.slug, name: sp.name, lat: sp.lat, lng: sp.lon, match: sp.match, label: sp.name }))}
                  highlight={topSpot?.slug}
                  center={[ziel.lon, ziel.lat]}
                  zoom={11.5}
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
                  city: "",
                  name: sp.name,
                  short: sp.area ? `In ${sp.area}` : "",
                  scores: sp.scores,
                  match: weights ? sp.match : undefined,
                  href: spotHref(sp),
                }))}
              />
            </section>
          )}

          {spots.length > 0 ? (
            <details className="group mt-7">
            <summary className="press flex cursor-pointer list-none items-center gap-3 rounded-[18px] bg-paper px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <Icon name="map" size={20} className="text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{`Alle ${sorted.length} Stadtteile ansehen`}</span>
                <span className="block text-[13px] text-muted">Die ganze Stadt in größeren Stücken</span>
              </span>
              <Icon name="chevron" size={16} className="text-faint transition-transform group-open:rotate-90" />
            </summary>
              <div className="mt-2">{districtList}</div>
            </details>
          ) : (
            <section className="mt-7">
              <h2 className="mb-3 font-display text-[19px] font-extrabold">{top ? "Alle Viertel für dich" : "Oder selbst stöbern"}</h2>
              {districtList}
            </section>
          )}

          {spots.length === 0 && (
            <section className="mt-7">
              <KiezMap
                points={sorted.map((d) => ({ slug: d.slug, name: d.name, lat: d.lat, lng: d.lon, match: d.match ?? 0, label: d.name }))}
                center={[ziel.lon, ziel.lat]}
                zoom={11.5}
                height="h-64"
                zones={zones}
                fit
              />
              <ZoneLegend personal={Boolean(weights)} shown={zones.length > 0} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
