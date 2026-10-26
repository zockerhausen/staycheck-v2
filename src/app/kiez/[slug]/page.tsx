import Link from "next/link";
import { notFound } from "next/navigation";
import { getCities, getCriteria, getDistricts, getExtras, getFavoriteIds, getSavedPlaces, getUser, resolveWeights, weightsToQuery } from "@/lib/data";
import { after } from "next/server";
import { cityZones, DEFAULT_WEIGHTS, hotelsNearCached, verdict, withDeadline, type HotelResult } from "@/lib/geo";
import StillLoading from "@/components/StillLoading";
import { matchScore, topReasons } from "@/lib/matching";
import FavoriteButton from "@/components/FavoriteButton";
import { personalMatch } from "@/lib/profile";
import { characterOf, traitsOf } from "@/lib/character";
import Icon from "@/components/Icon";
import KiezMap from "@/components/KiezMap";
import ZoneLegend from "@/components/ZoneLegend";
import AskDistrict from "@/components/AskDistrict";
import StayButton from "@/components/StayButton";
import { inBudget, PRICE_LABEL, priceClass } from "@/lib/price";
import DistrictVibe from "@/components/DistrictVibe";
import NearbyFacts from "@/components/NearbyFacts";
import { assistantEnabled } from "@/lib/assistant";
import ScoreBars from "@/components/ScoreBars";
import PlaceSaveButton from "@/components/PlaceSaveButton";
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
    cityRow ? cityZones(cityRow.lat, cityRow.lng, 6000, weights) : Promise.resolve([]),
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
  const shown =
    filter === "alle"
      ? hotels
      : filter === "budget"
        ? hotels.filter((h) => inBudget(band, clsOf(h)) !== false)
        : hotels.filter((h) => h.kind === filter);
  const filters = [...(band ? [{ key: "budget", label: `Mein Budget ${PRICE_LABEL[band]}` }] : []), ...FILTERS];
  const isSaved = (h: HotelResult) => saved.some((p) => Math.abs(p.lat - h.lat) < 1e-6 && Math.abs(p.lon - h.lon) < 1e-6);
  const checkUrl = (h: HotelResult) =>
    `/check/ergebnis?${new URLSearchParams({ lat: h.lat.toFixed(6), lon: h.lon.toFixed(6), name: h.name, sub: h.subtitle, kind: h.kind })}${amp}`;

  const match = matchScore(district, weights);
  const tileKeys = [...topReasons(district, weights, 3), "quiet"].filter((k, i, all) => all.indexOf(k) === i).slice(0, 4);
  const label = (k: string) => criteria.find((c) => c.key === k)?.label ?? k;

  return (
    <div className="fade-up space-y-7">
      <section className="hero-glow -mx-4 -mt-[max(1.25rem,env(safe-area-inset-top))] px-4 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link
            href={`/ergebnis?stadt=${district.city}${amp}`}
            aria-label="Zurück"
            className="press flex h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur"
          >
            <Icon name="back" size={18} />
          </Link>
          {user && <FavoriteButton districtId={district.id} isFavorite={favorites.has(district.id)} />}
        </div>
        <p className="mt-16 text-xs font-bold uppercase tracking-[0.08em] text-[#ffb08f]">
          {cityName} · {resolved ? `${match} % Match` : characterOf(district.scores, cityPool)}
        </p>
        <h1 className="mega mt-1 text-[clamp(2.4rem,12vw,3.3rem)] [overflow-wrap:anywhere]">{district.name.split(" (")[0]}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#c9c0bb]">{district.short_description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {traitsOf(district.scores, cityPool).map((t) => (
            <span key={t.key} className="flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-[13px] font-semibold">
              <Icon name={t.icon} size={14} /> {t.label}
            </span>
          ))}
        </div>
        <a href="#unterkuenfte" className="btn-chunky mt-5 w-full">
          <Icon name="hotel" size={20} /> Unterkünfte in {district.name.split(" (")[0]}
        </a>
        {!resolved && (
          <Link href={`/quiz?stadt=${district.city}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sun-soft">
            Passt das zu mir? Reise-Profil in 30 Sek. <Icon name="chevron" size={14} />
          </Link>
        )}
      </section>

      <AskDistrict
        target={{ art: "kiez", slug: district.slug, stadt: district.city }}
        place={district.name.split(" (")[0]}
        enabled={assistantEnabled()}
      />

      <section id="unterkuenfte" className="scroll-mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-extrabold">Beste Lage im Viertel</h2>
          {!failed && !slow && <span className="text-sm text-muted">{shown.length} gefunden</span>}
        </div>

        <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Unterkunftsart">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={`/kiez/${slug}?stadt=${district.city}&typ=${f.key}${amp}`}
              scroll={false}
              className={`press shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${
                filter === f.key ? "bg-ink text-sand" : "bg-tan"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {slow ? (
          <StillLoading title="Wir prüfen die Unterkünfte …" text="Für jede Unterkunft schauen wir uns die Umgebung an. Beim ersten Mal dauert das etwas, die Seite lädt von selbst neu." />
        ) : failed ? (
          <p className="card mt-4 p-4 text-sm text-muted">Die Kartendaten sind gerade überlastet. Lade die Seite in einer Minute neu.</p>
        ) : shown.length === 0 ? (
          <p className="card mt-4 p-4 text-sm text-muted">Hier haben wir keine passenden Unterkünfte gefunden.</p>
        ) : (
          <>
            <div className="mt-4">
              <KiezMap
                points={shown.slice(0, 25).map((h, i) => ({ slug: `h${i}`, name: h.name, lat: h.lat, lng: h.lon, match: h.match }))}
                highlight="h0"
                center={[district.lng, district.lat]}
                zoom={13.6}
                height="h-60"
                zones={zones}
              />
              <ZoneLegend personal={Boolean(resolved)} shown={zones.length > 0} />
            </div>
            <ol className="mt-2">
              {shown.slice(0, 25).map((h, i) => (
                <li key={`${h.lat}-${h.lon}`} id={`kiez-h${i}`} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <span className="w-5 shrink-0 font-bold text-faint">{i + 1}</span>
                  <Link href={checkUrl(h)} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-raised">
                      <Icon name="hotel" size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{h.name}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {KIND_LABEL[h.kind] ?? "Unterkunft"}{clsOf(h) ? ` · ${PRICE_LABEL[clsOf(h)!]}` : ""}{inBudget(band, clsOf(h)) === false ? " · über Budget" : ""} · {h.highlights[0]?.text ?? verdict(h.match).label}
                      </span>
                    </span>
                    <span className="font-display text-[17px] font-extrabold tabular-nums text-sun-soft">{h.match}</span>
                  </Link>
                  <PlaceSaveButton
                    compact
                    place={{ name: h.name, subtitle: h.subtitle, lat: h.lat, lon: h.lon, kind: h.kind, match: h.match }}
                    initiallySaved={isSaved(h)}
                    loggedIn={Boolean(user)}
                    returnTo={`/kiez/${slug}?stadt=${district.city}${amp}`}
                  />
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">
              Unterkünfte und Umgebung aus OpenStreetMap. Tippe auf eine Unterkunft für Details, Anreise und Preise.
            </p>
          </>
        )}
      </section>

      <DistrictVibe name={district.name.split(" (")[0]} scores={district.scores} />
      <NearbyFacts lat={district.lat} lon={district.lng} name={district.name.split(" (")[0]} />

      <div className="grid grid-cols-4 gap-2">
        {tileKeys.map((k) => (
          <div key={k} className="rounded-[18px] bg-paper px-1 py-3 text-center">
            <b className={`block font-display text-[22px] font-extrabold ${(district.scores[k] ?? 0) <= 4 ? "text-sun-soft" : ""}`}>
              {district.scores[k]}
            </b>
            <span className="block truncate text-[11px] font-semibold text-muted">{label(k)}</span>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <ScoreBars criteria={criteria} scores={district.scores} />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Viertel-Werte sind unsere Einschätzung fürs ganze Viertel. Jede Unterkunft prüfen wir zusätzlich einzeln mit Kartendaten.{" "}
          <Link href="/methode" className="font-semibold text-sun-soft underline underline-offset-4">
            So rechnen wir
          </Link>
        </p>
      </div>

      <TipsSection
        tips={tips}
        userId={user?.id ?? null}
        lat={district.lat}
        lon={district.lng}
        placeName={district.name}
        districtId={district.id}
        returnTo={`/kiez/${slug}?stadt=${district.city}`}
        title={`Tipps zu ${district.name.split(" (")[0]}`}
      />
      <StayButton targetId="unterkuenfte" label="Unterkünfte hier" />
    </div>
  );
}
