import BackButton from "@/components/BackButton";
import { VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCities, getCriteria, getDistricts, getExtras, getFavoriteIds, getSavedPlaces, getUser, resolveWeights, weightsToQuery } from "@/lib/data";
import { after } from "next/server";
import { cityZones, DEFAULT_WEIGHTS, hotelsNearCached, verdict, withDeadline, type HotelResult } from "@/lib/geo";
import StillLoading from "@/components/StillLoading";
import { matchScore } from "@/lib/matching";
import FavoriteButton from "@/components/FavoriteButton";
import { personalMatch } from "@/lib/profile";
import { characterTint, traitsOf } from "@/lib/character";
import Icon from "@/components/Icon";
import KiezMap from "@/components/KiezMap";
import ZoneLegend from "@/components/ZoneLegend";
import AskDistrict from "@/components/AskDistrict";
import { dedupeStays } from "@/lib/geo";
import { fmtScore, reviewsForMany, stayKey, TOP_FAIR } from "@/lib/reviews";
import StayTip from "@/components/StayTip";
import { inBudget, PRICE_LABEL, priceClass } from "@/lib/price";
import DistrictVibe from "@/components/DistrictVibe";
import NearbyFacts from "@/components/NearbyFacts";
import { assistantEnabled } from "@/lib/assistant";
import ScoreBars from "@/components/ScoreBars";
import AreaHero from "@/components/AreaHero";
import StayRow from "@/components/StayRow";
import ViewTabs from "@/components/ViewTabs";
import WebInsight from "@/components/WebInsight";
import { insightNear } from "@/lib/insights";
import { areaPhoto } from "@/lib/photos";
import TipsSection from "@/components/TipsSection";
import { getTipsForDistrict } from "@/lib/tips";

// Dynamisch durch Cookies/Suchparameter; Kartendaten-Abfragen werden 1 Tag zwischengespeichert.
export const fetchCache = "default-cache";
export const maxDuration = 120; // Unterkünfte dürfen im Hintergrund fertig gerechnet werden

const KIND_LABEL: Record<string, string> = {
  hotel: "Hotel",
  hostel: "Hostel",
  guest_house: "Pension",
  apartment: "Apartment",
};
const FILTERS = [
  { key: "alle", label: "Alle" },
  { key: "top", label: "Top bewertet" },
  { key: "hostel", label: "Hostels" },
  { key: "hotel", label: "Hotels" },
  { key: "guest_house", label: "Pensionen" },
  { key: "apartment", label: "Apartments" },
];

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
  const filter = typeof sp.typ === "string" && (sp.typ === "budget" || FILTERS.some((f) => f.key === sp.typ)) ? sp.typ : "alle";

  const cityRow = cities.find((c) => c.slug === district.city);
  const [tips, zones] = await Promise.all([
    getTipsForDistrict(district.id),
    cityRow ? cityZones(cityRow.lat, cityRow.lng, VERIFIED_RADIUS, weights) : Promise.resolve([]),
  ]);

  let hotels: HotelResult[] = [];
  let failed = false;
  const work = hotelsNearCached({ lat: district.lat, lon: district.lng }, district, weights, 1000, district.name);
  const raced = await withDeadline(work.catch(() => null), 9_000);
  const slow = raced === "slow";
  if (slow) after(() => work.catch(() => undefined));
  else if (raced === null) failed = true;
  else hotels = raced;
  // Persönlicher Match inkl. Extras und Muss (Liste neu sortieren)
  if (resolved) {
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
  const tipStay = shown
    .filter((h) => (revOf(h)?.fair ?? 0) >= TOP_FAIR && (revOf(h)?.total ?? 0) >= 100 && inBudget(band, clsOf(h)) !== false)
    .map((h) => ({ h, value: h.match * 0.6 + (revOf(h)!.fair * 10) * 0.4 }))
    .sort((a, b) => b.value - a.value)[0]?.h;
  const isSaved = (h: HotelResult) => saved.some((p) => Math.abs(p.lat - h.lat) < 1e-6 && Math.abs(p.lon - h.lon) < 1e-6);
  const checkUrl = (h: HotelResult) =>
    `/check/ergebnis?${new URLSearchParams({ lat: h.lat.toFixed(6), lon: h.lon.toFixed(6), name: h.name, sub: h.subtitle, kind: h.kind })}${amp}`;

  const match = matchScore(district, weights);

  const short = district.name.split(" (")[0];
  const webInsight = await insightNear(district.lat!, district.lng!, short).catch(() => null);
  const photoWork = areaPhoto(short, cityName, district.lat, district.lng, 600);
  const photoRaced = await withDeadline(photoWork, 2500);
  if (photoRaced === "slow") after(() => photoWork);
  const photo = photoRaced === "slow" ? null : photoRaced;
  const revList = [...rev.values()];
  const guestAvg = revList.length ? revList.reduce((s2, r) => s2 + r.fair, 0) / revList.length : null;
  const classes = hotels.map(clsOf).filter((c): c is NonNullable<ReturnType<typeof clsOf>> => c !== null).sort();
  const typicalPrice = classes.length ? PRICE_LABEL[classes[Math.floor(classes.length / 2)]] : null;
  const demo = revList.some((r) => r.demo);
  const self = `/kiez/${slug}?stadt=${district.city}${amp}`;

  const staysTab = (
    <section id="unterkuenfte" className="scroll-mt-20">
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Unterkunftsart">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/kiez/${slug}?stadt=${district.city}&typ=${f.key}${amp}`}
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
                note={h.highlights[0]?.text ?? verdict(h.match).label}
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
              center={[district.lng!, district.lat!]}
              zoom={13.6}
              height="h-64"
              zones={zones}
            />
            <ZoneLegend personal={Boolean(resolved)} shown={zones.length > 0} />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-muted">
            Unterkünfte und Umgebung aus OpenStreetMap. Tippe auf eine Unterkunft für Details, Anreise und Preise.
            {demo ? " Gäste-Werte sind vorerst Beispieldaten." : ""}
          </p>
        </>
      )}
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
          <Link href={`/quiz?stadt=${district.city}`} className="press flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3.5 text-[15px] font-extrabold">
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
                  <div className="card p-5">
                    <ScoreBars criteria={criteria} scores={district.scores} />
                    <p className="mt-3 text-[13px] font-semibold leading-relaxed text-muted">
                      Viertel-Werte sind unsere Einschätzung fürs ganze Viertel. Jede Unterkunft prüfen wir zusätzlich einzeln mit Kartendaten.{" "}
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
