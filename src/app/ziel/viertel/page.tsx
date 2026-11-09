import BackButton from "@/components/BackButton";
import { CITY_RADIUS, VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCriteria, getDistricts, getExtras, getProfile, getSavedPlaces, getUser } from "@/lib/data";
import { after } from "next/server";
import { alignStays, autoCityCached, DEFAULT_WEIGHTS, distance, hotelsNearCached, locationMatch, withDeadline, type HotelResult } from "@/lib/geo";
import StillLoading from "@/components/StillLoading";
import { ZONE_KEYS } from "@/lib/zones";
import { goodArea } from "@/lib/good-area";
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
import { fullWeights, personalMatch } from "@/lib/profile";
import { parseZiel, zielQuery } from "@/lib/ziel";
import { characterTint, traitsOf } from "@/lib/character";
import { CRITERION_ICON } from "@/lib/icons";
import { pageRateLimit } from "@/lib/ratelimit-page";
import Icon from "@/components/Icon";
import AreaHero from "@/components/AreaHero";
import StayList from "@/components/StayList";
import { buildStayList, STAY_FILTERS } from "@/lib/stay-list";
import { liveStaysNear } from "@/lib/stay22-api";
import ViewTabs from "@/components/ViewTabs";
import WebInsight from "@/components/WebInsight";
import { insightNear } from "@/lib/insights";
import { areaPhoto } from "@/lib/photos";
import { maxPriceFor, partnerOn, stayLink } from "@/lib/partner";
import { parseTrip, tripQuery } from "@/lib/trip";
import StaysPanel from "@/components/StaysPanel";

export const fetchCache = "default-cache";
export const maxDuration = 120; // erste Berechnung einer Stadt kann dauern (läuft nach der Antwort weiter)


/** Ein automatisch gefundenes Viertel in einer Stadt ohne Handbewertung, mit Unterkünften nach Lage. */
/** Umkreis des Viertels in Metern: so weit suchen wir Unterkünfte, genau so groß ist es auf der Karte markiert */
const STAY_RADIUS = 800;

export default async function AutoViertelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ziel = parseZiel(params);
  const vlat = Number(params.vlat);
  const vlon = Number(params.vlon);
  const name = typeof params.name === "string" ? params.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80) : "";
  if (!ziel || !name || !Number.isFinite(vlat) || !Number.isFinite(vlon) || Math.abs(vlat) > 85 || Math.abs(vlon) > 180) redirect("/?ziel=neu");
  const zq = zielQuery(ziel);
  // Größeres Raster für geprüfte Großstädte (Berlin, Bangkok), sonst Standard
  const rad = params.rad === String(VERIFIED_RADIUS) ? VERIFIED_RADIUS : CITY_RADIUS;
  const back = `/ziel?${zq}`;
  const filter = typeof params.typ === "string" && STAY_FILTERS.some((f) => f.key === params.typ) ? params.typ : "alle";
  const trip = parseTrip(params);
  const tq = tripQuery(trip);
  const self = `/ziel/viertel?${zq}&${new URLSearchParams({ name, vlat: vlat.toFixed(5), vlon: vlon.toFixed(5), ...(rad === VERIFIED_RADIUS ? { rad: String(VERIFIED_RADIUS) } : {}) })}`;

  if (!(await pageRateLimit("ziel-viertel", 15))) {
    return <p className="card mt-8 p-5 text-sm text-muted">Zu viele Anfragen in kurzer Zeit. Warte eine Minute und lade die Seite neu.</p>;
  }

  const criteria = await getCriteria();
  const cityWork = autoCityCached(ziel.lat, ziel.lon, rad).catch(() => null);
  const [{ weights: profile }, user, saved, cityRaw] = await Promise.all([
    getProfile(criteria),
    getUser(),
    getSavedPlaces(),
    withDeadline(cityWork, 6_000),
  ]);
  if (cityRaw === "slow") after(() => cityWork);
  const cityData = cityRaw === "slow" ? null : cityRaw;
  const weights = profile ?? DEFAULT_WEIGHTS;
  const districts = cityData?.districts ?? [];
  // Die gute Lage rund um diese Stelle als Fläche (Karte und „drin / knapp außerhalb“ in der Liste)
  const good = cityData ? goodArea(cityData.zones, { lat: vlat, lon: vlon }, STAY_RADIUS, weights, (await getExtras()).nogo) : null;
  // Ein bekanntes Viertel an dieser Stelle – sonst eine „Ecke“: Werte aus dem Raster rundherum (450 m)
  const near = (cityData?.zones ?? []).filter((z) => distance(z.lat, z.lon, vlat, vlon) <= 450);
  const district =
    districts.find((d) => distance(d.lat, d.lon, vlat, vlon) < 300) ??
    (near.length
      ? {
          slug: "ecke",
          name,
          lat: vlat,
          lon: vlon,
          distKm: Math.round(distance(ziel.lat, ziel.lon, vlat, vlon) / 100) / 10,
          scores: Object.fromEntries(
            ZONE_KEYS.map((k, i) => [k, Math.round((near.reduce((s, z) => s + z.s[i], 0) / near.length) * 10) / 10]),
          ) as Record<string, number | null>,
          reasons: Object.fromEntries(
            ZONE_KEYS.map((k) => [k, `Durchschnitt von ${near.length} Messpunkten in dieser Ecke (Umkreis 450 m)`]),
          ) as Record<string, string>,
        }
      : undefined);

  let hotels: HotelResult[] = [];
  let failed = false;
  const work = hotelsNearCached({ lat: Number(vlat.toFixed(5)), lon: Number(vlon.toFixed(5)) }, null, weights, STAY_RADIUS, name);
  const raced = await withDeadline(work.catch(() => null), 9_000);
  const slow = raced === "slow";
  if (slow) after(() => work.catch(() => undefined));
  else if (raced === null) failed = true;
  else hotels = raced;
  // Gleiche Werte wie auf der Detailseite jeder Unterkunft (Sicherheit vom nächsten geprüften Viertel, gleiche Formel)
  {
    const [ex, dbDistricts] = await Promise.all([getExtras(), getDistricts()]);
    hotels = alignStays(hotels, dbDistricts, (sc) => (profile ? personalMatch(sc, weights, ex).match : locationMatch(sc, DEFAULT_WEIGHTS)));
  }
  // Budget aus dem Reise-Profil: eigener Filter, Preisklasse an jeder Unterkunft (geschätzt)
  const band = (await getExtras()).preis ?? null;
  const clsOf = (h: HotelResult) => priceClass(h.kind, h.stars ?? 0);
  const maxNight = trip.max !== undefined ? trip.max : maxPriceFor(band);
  hotels = dedupeStays(hotels);
  // Link genau zu einer Unterkunft (Stay22 sucht sie bei Booking, Agoda, Expedia, Hotels.com)
  const place = [ziel.ort, ziel.land].filter(Boolean).join(", ");
  const bookingOf = (h: HotelResult) =>
    partnerOn
      ? stayLink({ name: h.name, lat: h.lat, lon: h.lon, place, campaign: `spot_${ziel.ort}_${name}`, checkin: trip.checkin, checkout: trip.checkout, adults: trip.adults })
      : undefined;
  // Nur echte Daten: Bewertungen (Tripadvisor) und buchbare Unterkünfte mit Preis (Stay22) – ohne Schlüssel bleibt beides leer
  const [rev, live] = await Promise.all([
    reviewsForMany(hotels.slice(0, 30).map((h) => ({ name: h.name, lat: h.lat, lon: h.lon, kind: h.kind }))),
    slow || failed ? Promise.resolve(null) : liveStaysNear({ lat: vlat, lon: vlon }, STAY_RADIUS, trip, `spot_${ziel.ort}_${name}`),
  ]);
  const listEx = await getExtras();
  const list = buildStayList({
    hotels,
    weights: profile ? fullWeights(weights, listEx) : weights,
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
    href: `${self}&typ=${f.key}${tq}`,
    active: filter === f.key,
  }));
  const isSaved = (h: HotelResult) => saved.some((p) => Math.abs(p.lat - h.lat) < 1e-6 && Math.abs(p.lon - h.lon) < 1e-6);
  const checkUrl = (h: HotelResult) =>
    `/check/ergebnis?${new URLSearchParams({ lat: h.lat.toFixed(6), lon: h.lon.toFixed(6), name: h.name, sub: `${h.subtitle}, ${ziel.ort}`, kind: h.kind })}${tq}`;
  const scores = district?.scores ?? {};
  const pool = districts.map((d) => d.scores);

  // Kopf: Foto, drei Zahlen (Lage, Gäste, Preis)
  const webInsight = await insightNear(vlat!, vlon!, name).catch(() => null);
  // Reiseführer-Text (Wikivoyage), höchstens kurz warten
  const guideWork = guideNear(vlat!, vlon!);
  const guideRaced = await withDeadline(guideWork, 2500);
  if (guideRaced === "slow") after(() => guideWork); // beim nächsten Mal sofort da
  const guide = guideRaced === "slow" ? null : guideRaced;
  const photoWork = areaPhoto(name, ziel.ort, vlat, vlon);
  const photoRaced = await withDeadline(photoWork, 2500);
  if (photoRaced === "slow") after(() => photoWork);
  const photo = photoRaced === "slow" ? null : photoRaced;
  const lageValue = district ? (profile ? locationMatch(district.scores, profile) : locationMatch(district.scores, DEFAULT_WEIGHTS)) : null;
  const revList = shown.flatMap((i) => (i.reviews ? [i.reviews] : [])); // nur echte Bewertungen (Tripadvisor, Stay22)
  const guestAvg = revList.length ? revList.reduce((s, r) => s + r.fair, 0) / revList.length : null;
  const classes = hotels.map(clsOf).filter((c): c is NonNullable<ReturnType<typeof clsOf>> => c !== null).sort();
  const typicalPrice = classes.length ? PRICE_LABEL[classes[Math.floor(classes.length / 2)]] : null;
  const demo = revList.some((r) => r.demo);

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
        area={{ lat: vlat, lon: vlon, radius: STAY_RADIUS, name: name, rings: good?.rings }}
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
            center={{ lat: vlat, lon: vlon }}
            radius={STAY_RADIUS}
            budget={maxNight}
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

  const hubs = await hubsNear(vlat, vlon);
  const valuesCard = district && (
    <section className="card mt-5 px-5 py-2">
      {criteria.map((c) => {
        const v = district.scores[c.key];
        return (
          <div key={c.key} className="border-b border-line py-3 last:border-0">
            <div className="flex items-center gap-3 text-[15px]">
              <span className="flex w-32 shrink-0 items-center gap-2 font-extrabold">
                <Icon name={CRITERION_ICON[c.key]} size={19} /> {c.label}
              </span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-peach">
                {v !== null && v !== undefined && (
                  <span className={`bar-grow block h-full rounded-full ${v <= 4 ? "bg-bad" : "bg-sun"}`} style={{ width: `${v * 10}%` }} />
                )}
              </span>
              <span className="w-7 text-right font-extrabold tabular-nums">{v === null || v === undefined ? "–" : Math.round(v)}</span>
            </div>
            <p className="mt-1 pl-[27px] text-[13px] font-semibold text-muted">{district.reasons[c.key]}</p>
          </div>
        );
      })}
      <p className="py-3 text-[13px] font-semibold leading-relaxed text-muted">
        Automatisch aus OpenStreetMap, gezählt rund um die Mitte des Viertels. Jede Unterkunft prüfen wir einzeln genauer.
      </p>
    </section>
  );

  return (
    <div className="fade-up">
      <AreaHero
        name={name}
        where={`${ziel.ort}${district ? `, ${district.distKm < 1.5 ? "im Zentrum" : `${String(district.distKm).replace(".", ",")} km vom Zentrum`}` : ""}`}
        photo={photo}
        tint={characterTint(scores, pool)}
        backHref={back}
        traits={traitsOf(scores, pool).slice(0, 3)}
        tiles={[
          { value: lageValue !== null ? String(lageValue) : "–", label: profile ? "Lage für dich" : "Lage allgemein", accent: true },
          { value: guestAvg !== null ? fmtScore(guestAvg) : "–", label: demo ? "Gäste (Beispiel)" : "Gäste im Schnitt" },
          { value: typicalPrice ?? "–", label: "Meiste Unterkünfte" },
        ]}
      >
        {!profile && (
          <Link href={`/quiz?${zq}`} className="press card flex items-center justify-between gap-3 !rounded-[24px] px-4 py-3.5 text-[15px] font-extrabold">
            Passt das zu mir?
            <span className="flex items-center gap-1 text-sun-soft">
              Quiz in 30 Sek. <Icon name="chevron" size={14} />
            </span>
          </Link>
        )}

        <AskDistrict
          target={{ art: "auto", ort: ziel.ort, land: ziel.land, lat: ziel.lat, lon: ziel.lon, name, vlat, vlon }}
          place={name}
          enabled={assistantEnabled()}
        />

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
                  {district ? <DistrictVibe name={name} scores={scores} /> : <p className="card p-4 text-[15px] text-muted">Für diese Ecke haben wir zu wenig Daten.</p>}
                </div>
              ),
            },
            {
              key: "near",
              label: "Umgebung",
              content: (
                <div>
                  <NearbyFacts lat={vlat} lon={vlon} name={name} />
                  <div className="mt-5">
                    <ArrivalCard hubs={hubs} lat={vlat} lon={vlon} title="So weit ist es" />
                  </div>
                  {valuesCard}
                </div>
              ),
            },
          ]}
        />
      </AreaHero>
    </div>
  );
}
