import BackButton from "@/components/BackButton";
import { CITY_RADIUS, VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCriteria, getExtras, getProfile, getSavedPlaces, getUser } from "@/lib/data";
import { after } from "next/server";
import { autoCityCached, DEFAULT_WEIGHTS, distance, hotelsNearCached, locationMatch, withDeadline, type HotelResult } from "@/lib/geo";
import StillLoading from "@/components/StillLoading";
import { pickZones, ZONE_KEYS } from "@/lib/zones";
import ZoneLegend from "@/components/ZoneLegend";
import AskDistrict from "@/components/AskDistrict";
import { dedupeStays } from "@/lib/geo";
import { fmtScore, reviewsForMany, stayKey, TOP_FAIR } from "@/lib/reviews";
import StayTip from "@/components/StayTip";
import { inBudget, PRICE_LABEL, priceClass } from "@/lib/price";
import DistrictVibe from "@/components/DistrictVibe";
import NearbyFacts from "@/components/NearbyFacts";
import { assistantEnabled } from "@/lib/assistant";
import { personalMatch } from "@/lib/profile";
import { parseZiel, zielQuery } from "@/lib/ziel";
import { characterTint, traitsOf } from "@/lib/character";
import { CRITERION_ICON } from "@/lib/icons";
import { pageRateLimit } from "@/lib/ratelimit-page";
import Icon from "@/components/Icon";
import KiezMap from "@/components/KiezMap";
import AreaHero from "@/components/AreaHero";
import StayRow from "@/components/StayRow";
import ViewTabs from "@/components/ViewTabs";
import { areaPhoto } from "@/lib/photos";

export const fetchCache = "default-cache";
export const maxDuration = 120; // erste Berechnung einer Stadt kann dauern (läuft nach der Antwort weiter)

const KIND_LABEL: Record<string, string> = { hotel: "Hotel", hostel: "Hostel", guest_house: "Pension", apartment: "Apartment" };
const FILTERS = [
  { key: "alle", label: "Alle" },
  { key: "top", label: "Top bewertet" },
  { key: "hostel", label: "Hostels" },
  { key: "hotel", label: "Hotels" },
  { key: "guest_house", label: "Pensionen" },
  { key: "apartment", label: "Apartments" },
];

/** Ein automatisch gefundenes Viertel in einer Stadt ohne Handbewertung, mit Unterkünften nach Lage. */
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
  const filter = typeof params.typ === "string" && (params.typ === "budget" || FILTERS.some((f) => f.key === params.typ)) ? params.typ : "alle";
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
  const zones = cityData ? pickZones(cityData.zones, weights) : [];
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
  const work = hotelsNearCached({ lat: Number(vlat.toFixed(5)), lon: Number(vlon.toFixed(5)) }, null, weights, 800, name);
  const raced = await withDeadline(work.catch(() => null), 9_000);
  const slow = raced === "slow";
  if (slow) after(() => work.catch(() => undefined));
  else if (raced === null) failed = true;
  else hotels = raced;
  // Persönlicher Match inkl. Extras und Muss (Liste neu sortieren)
  if (profile) {
    const ex = await getExtras();
    if (ex.items.length) {
      hotels = hotels
        .map((h) => ({ ...h, match: personalMatch(h.scores, weights, ex).match }))
        .sort((a, b) => b.match - a.match);
    }
  }
  // Budget aus dem Reise-Profil: eigener Filter, Preisklasse an jeder Unterkunft (geschätzt)
  const band = (await getExtras()).preis ?? null;
  const clsOf = (h: HotelResult) => priceClass(h.kind, h.stars ?? 0);
  hotels = dedupeStays(hotels);
  // Bewertungen aller Plattformen (zusammengerechnet) für die besten Unterkünfte
  const rev = await reviewsForMany(hotels.slice(0, 80).map((h) => ({ name: h.name, lat: h.lat, lon: h.lon, kind: h.kind })));
  const revOf = (h: HotelResult) => rev.get(stayKey(h));
  const shown =
    filter === "alle"
      ? hotels
      : filter === "budget"
        ? hotels.filter((h) => inBudget(band, clsOf(h)) !== false)
        : filter === "top"
          ? hotels.filter((h) => (revOf(h)?.fair ?? 0) >= TOP_FAIR)
          : hotels.filter((h) => h.kind === filter);
  const filters = [
    ...(band ? [{ key: "budget", label: `Mein Budget ${PRICE_LABEL[band]}` }] : []),
    ...FILTERS.filter((f) => f.key !== "top" || rev.size > 0),
  ];
  // Unser Tipp: gute Lage + top bewertet + im Budget
  const tipStay = hotels
    .filter((h) => (revOf(h)?.fair ?? 0) >= TOP_FAIR && (revOf(h)?.total ?? 0) >= 100 && inBudget(band, clsOf(h)) !== false)
    .map((h) => ({ h, value: h.match * 0.6 + (revOf(h)!.fair * 10) * 0.4 }))
    .sort((a, b) => b.value - a.value)[0]?.h;
  const isSaved = (h: HotelResult) => saved.some((p) => Math.abs(p.lat - h.lat) < 1e-6 && Math.abs(p.lon - h.lon) < 1e-6);
  const checkUrl = (h: HotelResult) =>
    `/check/ergebnis?${new URLSearchParams({ lat: h.lat.toFixed(6), lon: h.lon.toFixed(6), name: h.name, sub: `${h.subtitle}, ${ziel.ort}`, kind: h.kind })}`;
  const scores = district?.scores ?? {};
  const pool = districts.map((d) => d.scores);

  // Kopf: Foto, drei Zahlen (Lage, Gäste, Preis)
  const photoWork = areaPhoto(name, ziel.ort, vlat, vlon);
  const photoRaced = await withDeadline(photoWork, 2500);
  if (photoRaced === "slow") after(() => photoWork);
  const photo = photoRaced === "slow" ? null : photoRaced;
  const lageValue = district ? (profile ? locationMatch(district.scores, profile) : locationMatch(district.scores, DEFAULT_WEIGHTS)) : null;
  const revList = [...rev.values()];
  const guestAvg = revList.length ? revList.reduce((s, r) => s + r.fair, 0) / revList.length : null;
  const classes = hotels.map(clsOf).filter((c): c is NonNullable<ReturnType<typeof clsOf>> => c !== null).sort();
  const typicalPrice = classes.length ? PRICE_LABEL[classes[Math.floor(classes.length / 2)]] : null;
  const demo = revList.some((r) => r.demo);

  const staysTab = (
    <section id="unterkuenfte" className="scroll-mt-20">
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Unterkunftsart">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`${self}&typ=${f.key}`}
            scroll={false}
            className={`press shrink-0 rounded-full border px-4 py-2.5 text-[14px] font-extrabold ${
              filter === f.key ? "border-ink bg-ink text-sand" : "border-line bg-sand"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {slow ? (
        <StillLoading title="Wir prüfen die Unterkünfte …" text="Für jede Unterkunft schauen wir uns die Umgebung an. Beim ersten Mal dauert das etwas, die Seite lädt von selbst neu." />
      ) : failed ? (
        <p className="card mt-4 p-4 text-[15px] text-muted">Die Kartendaten sind gerade überlastet. Lade die Seite in einer Minute neu.</p>
      ) : shown.length === 0 ? (
        <p className="card mt-4 p-4 text-[15px] text-muted">Hier haben wir keine passenden Unterkünfte gefunden.</p>
      ) : (
        <>
          {tipStay && filter !== "top" && (
            <StayTip
              href={checkUrl(tipStay)}
              name={tipStay.name}
              kind={KIND_LABEL[tipStay.kind] ?? "Unterkunft"}
              price={clsOf(tipStay) ? PRICE_LABEL[clsOf(tipStay)!] : null}
              match={tipStay.match}
              reviews={revOf(tipStay)!}
              budget={Boolean(band)}
            />
          )}
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[20px] font-black tracking-tight">Beste Lage im Viertel</h2>
            <span className="text-[14px] font-bold text-muted">{shown.length} gefunden</span>
          </div>
          <ol className="mt-1">
            {shown.slice(0, 25).map((h, i) => (
              <StayRow
                key={`${h.lat}-${h.lon}`}
                id={`kiez-h${i}`}
                href={checkUrl(h)}
                name={h.name}
                kind={KIND_LABEL[h.kind] ?? "Unterkunft"}
                price={clsOf(h) ? PRICE_LABEL[clsOf(h)!] : null}
                overBudget={inBudget(band, clsOf(h)) === false}
                note={h.highlights[0]?.text ?? ""}
                match={h.match}
                reviews={revOf(h)}
                save={{
                  place: { name: h.name, subtitle: h.subtitle, lat: h.lat, lon: h.lon, kind: h.kind, match: h.match },
                  initiallySaved: isSaved(h),
                  loggedIn: Boolean(user),
                  returnTo: self,
                }}
              />
            ))}
          </ol>
          <div className="mt-5">
            <KiezMap
              points={shown.slice(0, 25).map((h, i) => ({ slug: `h${i}`, name: h.name, lat: h.lat, lng: h.lon, match: h.match }))}
              highlight="h0"
              center={[vlon, vlat]}
              zoom={14}
              height="h-64"
              zones={zones}
            />
            <ZoneLegend personal={Boolean(profile)} shown={zones.length > 0} />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-muted">
            Tippe auf eine Unterkunft für Details, Begründung und Preise.{demo ? " Gäste-Werte sind vorerst Beispieldaten." : ""}
          </p>
        </>
      )}
    </section>
  );

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
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                {v !== null && v !== undefined && (
                  <span className={`bar-grow block h-full rounded-full ${v <= 4 ? "bg-bad" : "bg-ink"}`} style={{ width: `${v * 10}%` }} />
                )}
              </span>
              <span className="w-7 text-right font-black tabular-nums">{v === null || v === undefined ? "–" : Math.round(v)}</span>
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
    <div className="fade-up space-y-6">
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
      />

      {!profile && (
        <Link href={`/quiz?${zq}`} className="press flex items-center gap-3 rounded-[20px] bg-peach px-4 py-3.5">
          <Icon name="discover" size={22} className="text-sun-soft" />
          <span className="min-w-0 flex-1 text-[15px] font-extrabold">Passt das zu mir? Reise-Profil in 30 Sekunden</span>
          <Icon name="chevron" size={16} className="text-muted" />
        </Link>
      )}

      <ViewTabs
        tabs={[
          { key: "stay", label: "Unterkünfte", content: staysTab },
          {
            key: "vibe",
            label: "Tag und Nacht",
            content: (
              <div className="space-y-5">
                {district ? <DistrictVibe name={name} scores={scores} /> : <p className="card p-4 text-[15px] text-muted">Für diese Ecke haben wir zu wenig Daten.</p>}
                <AskDistrict
                  target={{ art: "auto", ort: ziel.ort, land: ziel.land, lat: ziel.lat, lon: ziel.lon, name, vlat, vlon }}
                  place={name}
                  enabled={assistantEnabled()}
                />
              </div>
            ),
          },
          {
            key: "near",
            label: "Umgebung",
            content: (
              <div>
                <NearbyFacts lat={vlat} lon={vlon} name={name} />
                {valuesCard}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
