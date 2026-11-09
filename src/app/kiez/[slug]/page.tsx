import BackButton from "@/components/BackButton";
import { VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCities, getCriteria, getDistricts, getExtras, getFavoriteIds, getSavedPlaces, getUser, resolveWeights, weightsToQuery } from "@/lib/data";
import { after } from "next/server";
import { alignStays, zonesCovering, cityDataQuick, DEFAULT_WEIGHTS, hotelsNearCached, locationMatch, verdict, withDeadline, type HotelResult } from "@/lib/geo";
import StillLoading from "@/components/StillLoading";
import { matchScore } from "@/lib/matching";
import FavoriteButton from "@/components/FavoriteButton";
import { fullWeights, personalMatch } from "@/lib/profile";
import { characterTint, traitsOf } from "@/lib/character";
import Icon from "@/components/Icon";
import AskDistrict from "@/components/AskDistrict";
import { dedupeStays } from "@/lib/geo";
import { fmtScore, reviewsForMany } from "@/lib/reviews";
import { PRICE_LABEL, priceClass } from "@/lib/price";
import DistrictVibe from "@/components/DistrictVibe";
import NearbyFacts from "@/components/NearbyFacts";
import ArrivalCard from "@/components/ArrivalCard";
import GuideCard from "@/components/GuideCard";
import { guideNear } from "@/lib/wikivoyage";
import { hubsNear } from "@/lib/arrival-hubs";
import { assistantEnabled } from "@/lib/assistant";
import ScoreBars from "@/components/ScoreBars";
import AreaHero from "@/components/AreaHero";
import StayList from "@/components/StayList";
import { buildStayList, STAY_FILTERS } from "@/lib/stay-list";
import { liveStaysNear } from "@/lib/stay22-api";
import ViewTabs from "@/components/ViewTabs";
import WebInsight from "@/components/WebInsight";
import { insightNear } from "@/lib/insights";
import { areaPhoto } from "@/lib/photos";
import TipsSection from "@/components/TipsSection";
import { getTipsForDistrict } from "@/lib/tips";
import { maxPriceFor, partnerOn, stayLink } from "@/lib/partner";
import { goodArea } from "@/lib/good-area";
import { parseTrip, tripQuery } from "@/lib/trip";
import StaysPanel from "@/components/StaysPanel";

// Dynamisch durch Cookies/Suchparameter; Kartendaten-Abfragen werden 1 Tag zwischengespeichert.
export const fetchCache = "default-cache";
export const maxDuration = 120; // Unterkünfte dürfen im Hintergrund fertig gerechnet werden


/** Umkreis des Viertels in Metern: so weit suchen wir Unterkünfte, genau so groß ist es auf der Karte markiert */
const STAY_RADIUS = 1000;

export default async function KiezPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const [criteria, districts, user, saved, cities, favorites] = await Promise.all([
    getCriteria(),
    getDistricts(),
    getUser(),
    getSavedPlaces(),
    getCities(),
    getFavoriteIds(),
  ]);
  const wantedCity = typeof sp.stadt === "string" ? sp.stadt : undefined;
  const district =
    districts.find((d) => d.slug === slug && (!wantedCity || d.city === wantedCity)) ?? districts.find((d) => d.slug === slug);
  if (!district || district.lat === null || district.lng === null) notFound();
  const cityPool = districts.filter((d) => d.city === district.city).map((d) => d.scores);
  const cityName = cities.find((c) => c.slug === district.city)?.name ?? "";

  const { weights: resolved, source } = await resolveWeights(sp, criteria);
  const weights = resolved ?? DEFAULT_WEIGHTS;
  const query = source === "url" ? weightsToQuery(weights) : "";
  const amp = query ? `&${query}` : "";
  const filter = typeof sp.typ === "string" && STAY_FILTERS.some((f) => f.key === sp.typ) ? sp.typ : "alle";
  const showAll = (typeof sp.mehr === "string" && sp.mehr === "1");
  const trip = parseTrip(sp);
  const tq = tripQuery(trip);

  const cityRow = cities.find((c) => c.slug === district.city);
  const kiezExtras = await getExtras();
  const [tips, cityRaw] = await Promise.all([
    getTipsForDistrict(district.id),
    cityRow ? cityDataQuick(cityRow.lat, cityRow.lng, VERIFIED_RADIUS, 1200) : Promise.resolve(null),
  ]);

  let hotels: HotelResult[] = [];
  let failed = false;
  const work = hotelsNearCached({ lat: district.lat, lon: district.lng }, district, weights, STAY_RADIUS, district.name);
  const raced = await withDeadline(work.catch(() => null), 9_000);
  const slow = raced === "slow";
  if (slow) after(() => work.catch(() => undefined));
  else if (raced === null) failed = true;
  else hotels = raced;
  // Gleiche Werte wie auf der Detailseite jeder Unterkunft (Sicherheit vom nächsten Viertel, gleiche Formel)
  {
    const ex = await getExtras();
    const zones = cityRaw?.zones?.length ? cityRaw.zones : await zonesCovering(district.lat, district.lng);
    hotels = alignStays(hotels, districts, (sc, basis) => (resolved ? personalMatch(sc, weights, ex, basis).match : locationMatch(sc, DEFAULT_WEIGHTS)), zones);
  }
  // Budget aus dem Reise-Profil: eigener Filter, Preisklasse an jeder Unterkunft (geschätzt)
  const band = (await getExtras()).preis ?? null;
  const clsOf = (h: HotelResult) => priceClass(h.kind, h.stars ?? 0);
  const maxNight = trip.max !== undefined ? trip.max : maxPriceFor(band);
  hotels = dedupeStays(hotels);
  // Die gute Lage rund um das Viertel als Fläche (Karte und „drin / knapp daneben“ in der Liste); gut gelegene Unterkünfte zählen mit
  const good = cityRaw ? goodArea(cityRaw.zones, { lat: district.lat!, lon: district.lng! }, STAY_RADIUS, weights, kiezExtras.nogo, hotels) : null;
  // Link genau zu einer Unterkunft (Stay22 sucht sie bei Booking, Agoda, Expedia, Hotels.com)
  const place = [cityName, cityRow?.country].filter(Boolean).join(", ");
  const bookingOf = (h: HotelResult) =>
    partnerOn
      ? stayLink({ name: h.name, lat: h.lat, lon: h.lon, place, campaign: `kiez_${district.slug}`, checkin: trip.checkin, checkout: trip.checkout, adults: trip.adults })
      : undefined;
  // Nur echte Daten: Bewertungen (Tripadvisor) und buchbare Unterkünfte mit Preis (Stay22) – ohne Schlüssel bleibt beides leer
  const [rev, live] = await Promise.all([
    reviewsForMany(hotels.slice(0, 30).map((h) => ({ name: h.name, lat: h.lat, lon: h.lon, kind: h.kind }))),
    slow || failed ? Promise.resolve(null) : liveStaysNear({ lat: district.lat!, lon: district.lng! }, STAY_RADIUS, trip, `kiez_${district.slug}`),
  ]);
  const listEx = await getExtras();
  const list = buildStayList({
    hotels,
    weights: resolved ? fullWeights(weights, listEx) : weights,
    good,
    maxNight,
    filter,
    rev,
    live,
    booking: bookingOf,
  });
  const shown = list.items;
  const hiddenUnknown = list.hiddenUnknown;
  // Filter mit Anzahl; leere Filter weglassen (außer dem gerade gewählten)
  const chips = STAY_FILTERS.filter((f) => (f.key === "alle" || f.key === filter || (list.counts[f.key] ?? 0) > 0) && (f.key !== "top" || list.anyReviews)).map((f) => ({
    key: f.key,
    label: `${f.label} ${list.counts[f.key] ?? 0}`,
    href: `/kiez/${slug}?stadt=${district.city}&typ=${f.key}${amp}${tq}`,
    active: filter === f.key,
  }));
  const isSaved = (h: HotelResult) => saved.some((p) => Math.abs(p.lat - h.lat) < 1e-6 && Math.abs(p.lon - h.lon) < 1e-6);
  const checkUrl = (h: HotelResult) =>
    `/check/ergebnis?${new URLSearchParams({ lat: h.lat.toFixed(6), lon: h.lon.toFixed(6), name: h.name, sub: h.subtitle, kind: h.kind })}${amp}${tq}`;

  const match = matchScore(district, weights, kiezExtras.nogo);

  const short = district.name.split(" (")[0];
  const webInsight = await insightNear(district.lat!, district.lng!, short).catch(() => null);
  // Reiseführer-Text (Wikivoyage), höchstens kurz warten
  const guideWork = guideNear(district.lat!, district.lng!);
  const guideRaced = await withDeadline(guideWork, 2500);
  if (guideRaced === "slow") after(() => guideWork); // beim nächsten Mal sofort da
  const guide = guideRaced === "slow" ? null : guideRaced;
  const photoWork = areaPhoto(short, cityName, district.lat, district.lng, 600);
  const photoRaced = await withDeadline(photoWork, 2500);
  if (photoRaced === "slow") after(() => photoWork);
  const photo = photoRaced === "slow" ? null : photoRaced;
  const revList = shown.flatMap((i) => (i.reviews ? [i.reviews] : [])); // nur echte Bewertungen (Tripadvisor, Stay22)
  const guestAvg = revList.length ? revList.reduce((s2, r) => s2 + r.fair, 0) / revList.length : null;
  const classes = hotels.map(clsOf).filter((c): c is NonNullable<ReturnType<typeof clsOf>> => c !== null).sort();
  const typicalPrice = classes.length ? PRICE_LABEL[classes[Math.floor(classes.length / 2)]] : null;
  const demo = revList.some((r) => r.demo);
  const self = `/kiez/${slug}?stadt=${district.city}${amp}`;
  const hubs = await hubsNear(district.lat!, district.lng!, district.city);

  // Dieselben Unterkünfte wie in der Liste, gleiche Reihenfolge
  const stayPins = slow || failed
    ? []
    : shown.map((i) => ({
        name: i.name,
        lat: i.lat,
        lon: i.lon,
        match: i.match,
        meta: [i.kindLabel, i.price?.text].filter(Boolean).join(" · "),
        rating: i.reviews ? fmtScore(i.reviews.fair) : undefined,
        href: checkUrl(i.hotel),
        booking: i.booking,
        out: i.out,
      }));

  const staysTab = (
    <section id="unterkuenfte" className="scroll-mt-20">
      <StaysPanel
        checkin={trip.checkin}
        checkout={trip.checkout}
        nights={trip.nights}
        adults={trip.adults}
        max={maxNight}
        chips={chips}
        area={{ lat: district.lat!, lon: district.lng!, radius: STAY_RADIUS, name: short, rings: good?.rings }}
        stays={stayPins}
      >

      {slow ? (
        <StillLoading title="Wir prüfen die Unterkünfte …" text="Für jede Unterkunft schauen wir uns die Umgebung an. Beim ersten Mal dauert das etwas, die Seite lädt von selbst neu." />
      ) : failed ? (
        <p className="card mt-4 p-4 text-[15px] text-muted">Die Kartendaten sind gerade überlastet. Lade die Seite in einer Minute neu.</p>
      ) : shown.length === 0 ? (
        <p className="card mt-4 p-4 text-[15px] text-muted">
          {maxNight ? `Keine Unterkunft hier passt sicher in ${maxNight} € pro Nacht. Erhöhe oben das Budget, dann zeigen wir mehr.` : "Hier haben wir keine passenden Unterkünfte gefunden."}
        </p>
      ) : (
        <>
          <StayList
            items={shown}
            rings={good?.rings}
            center={{ lat: district.lat!, lon: district.lng! }}
            radius={STAY_RADIUS}
            budget={maxNight}
            limit={showAll ? Infinity : 40}
            moreHref={`/kiez/${slug}?stadt=${district.city}&typ=${filter}${amp}${tq}&mehr=1`}
            href={(i) => checkUrl(i.hotel)}
            save={(i) => ({
              place: { name: i.name, subtitle: i.hotel.subtitle, lat: i.lat, lon: i.lon, kind: i.kind, match: i.match },
              initiallySaved: isSaved(i.hotel),
              loggedIn: Boolean(user),
              returnTo: self,
            })}
          />
          {hiddenUnknown > 0 && <p className="mt-2 px-0.5 text-[12.5px] font-semibold text-muted">{hiddenUnknown} Unterkünfte ohne bekannte Preisklasse sind bei deinem Budget ausgeblendet.</p>}
        </>
      )}
      </StaysPanel>
    </section>
  );

  return (
    <div className="fade-up">
      <AreaHero
        name={short}
        where={district.short_description ?? cityName}
        photo={photo}
        tint={characterTint(district.scores, cityPool)}
        backHref={`/ergebnis?stadt=${district.city}${amp}`}
        action={user ? <FavoriteButton districtId={district.id} isFavorite={favorites.has(district.id)} /> : undefined}
        traits={traitsOf(district.scores, cityPool).slice(0, 3)}
        tiles={[
          { value: String(match), label: resolved ? "Lage für dich" : "Lage allgemein", accent: true },
          { value: guestAvg !== null ? fmtScore(guestAvg) : "–", label: demo ? "Gäste (Beispiel)" : "Gäste im Schnitt" },
          { value: typicalPrice ?? "–", label: "Meiste Unterkünfte" },
        ]}
      >
        {!resolved && (
          <Link href={`/quiz?stadt=${district.city}`} className="press card flex items-center justify-between gap-3 !rounded-[24px] px-4 py-3.5 text-[15px] font-extrabold">
            Passt das zu mir?
            <span className="flex items-center gap-1 text-sun-soft">
              Quiz in 30 Sek. <Icon name="chevron" size={14} />
            </span>
          </Link>
        )}

        <AskDistrict target={{ art: "kiez", slug: district.slug, stadt: district.city }} place={short} enabled={assistantEnabled()} />

        <ViewTabs
          tabs={[
            { key: "stay", label: "Unterkünfte", content: staysTab },
            {
              key: "vibe",
              label: "Tag und Nacht",
              content: (
                <div className="space-y-5">
                  <WebInsight insight={webInsight} />
                  <GuideCard guide={guide} />
                  <DistrictVibe name={short} scores={district.scores} />
                  <TipsSection
                    tips={tips}
                    userId={user?.id ?? null}
                    lat={district.lat!}
                    lon={district.lng!}
                    placeName={district.name}
                    districtId={district.id}
                    returnTo={`/kiez/${slug}?stadt=${district.city}`}
                    title={`Tipps zu ${short}`}
                  />
                </div>
              ),
            },
            {
              key: "near",
              label: "Umgebung",
              content: (
                <div className="space-y-5">
                  <NearbyFacts lat={district.lat!} lon={district.lng!} name={short} />
                  <ArrivalCard hubs={hubs} lat={district.lat!} lon={district.lng!} title="So weit ist es" />
                  <div className="card p-5">
                    <ScoreBars criteria={criteria} scores={district.scores} reasons={district.reasons} origin={district.origin} links={district.links} />
                    <p className="mt-3 text-[13px] font-semibold leading-relaxed text-muted">
                      Tippe auf einen Wert, um zu sehen, woher er kommt. Die Werte gelten fürs ganze Viertel, jede Unterkunft prüfen wir zusätzlich einzeln.{" "}
                      <Link href="/methode" className="font-bold text-sun-soft underline underline-offset-4">
                        So rechnen wir
                      </Link>
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </AreaHero>
    </div>
  );
}
