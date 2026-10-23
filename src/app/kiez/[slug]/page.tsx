import Link from "next/link";
import { notFound } from "next/navigation";
import { getCriteria, getDistricts, getSavedPlaces, getUser, resolveWeights, weightsToQuery } from "@/lib/data";
import { DEFAULT_WEIGHTS, hotelsNear, verdict, type HotelResult } from "@/lib/geo";
import { matchScore } from "@/lib/matching";
import Icon from "@/components/Icon";
import KiezMap from "@/components/KiezMap";
import ScoreBars from "@/components/ScoreBars";
import PlaceSaveButton from "@/components/PlaceSaveButton";

export const dynamic = "force-dynamic";

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
  const [criteria, districts, user, saved] = await Promise.all([getCriteria(), getDistricts(), getUser(), getSavedPlaces()]);
  const district = districts.find((d) => d.slug === slug);
  if (!district || district.lat === null || district.lng === null) notFound();

  const { weights: resolved } = await resolveWeights(sp, criteria);
  const weights = resolved ?? DEFAULT_WEIGHTS;
  const query = weightsToQuery(weights);
  const filter = typeof sp.typ === "string" ? sp.typ : "alle";

  let hotels: HotelResult[] = [];
  let failed = false;
  try {
    hotels = await hotelsNear({ lat: district.lat, lon: district.lng }, district, weights);
  } catch {
    failed = true;
  }
  const shown = filter === "alle" ? hotels : hotels.filter((h) => h.kind === filter);
  const isSaved = (h: HotelResult) => saved.some((p) => Math.abs(p.lat - h.lat) < 1e-6 && Math.abs(p.lon - h.lon) < 1e-6);
  const checkUrl = (h: HotelResult) =>
    `/check/ergebnis?${new URLSearchParams({ lat: h.lat.toFixed(6), lon: h.lon.toFixed(6), name: h.name, sub: h.subtitle, kind: h.kind })}&${query}`;

  return (
    <div className="space-y-7">
      <Link href={`/ergebnis?${query}`} className="flex items-center gap-1 text-sm font-semibold text-muted">
        <Icon name="back" size={18} /> Zurück
      </Link>

      <section>
        <p className="text-sm font-semibold text-peach-ink">Kiez in Berlin</p>
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight">{district.name}</h1>
        <p className="mt-1 text-muted">{district.short_description}</p>
        <div className="mt-4 rounded-3xl border-2 border-b-[5px] border-line bg-paper p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-lg font-bold">Dein Kiez-Match</span>
            <span className="rounded-2xl bg-sun px-3 py-1 font-display text-lg font-extrabold text-white">
              {matchScore(district, weights)}%
            </span>
          </div>
          <ScoreBars criteria={criteria} scores={district.scores} />
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <Icon name="hotel" size={28} className="text-sun" /> Unterkünfte mit bester Lage
        </h2>
        <p className="mt-1 text-sm text-muted">
          Sortiert nach Lage-Score für dich: Bahn, Bars, Essen, Ruhe und Grün direkt vor der Tür.
        </p>

        <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4" aria-label="Unterkunftsart">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/kiez/${slug}?${query}&typ=${f.key}`}
              scroll={false}
              className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold ${
                filter === f.key ? "border-sun bg-sun text-white" : "border-line bg-paper"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {failed ? (
          <p className="mt-5 rounded-2xl bg-tan p-4 text-sm font-semibold">
            Die Kartendaten sind gerade überlastet. Lade die Seite in einer Minute neu.
          </p>
        ) : shown.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-tan p-4 text-sm font-semibold">Hier haben wir keine passenden Unterkünfte gefunden.</p>
        ) : (
          <>
            <div className="mt-5">
              <KiezMap
                points={shown.slice(0, 25).map((h, i) => ({ slug: `h${i}`, name: h.name, lat: h.lat, lng: h.lon, match: h.match }))}
                highlight="h0"
                center={[district.lng, district.lat]}
                zoom={13.6}
                height="h-60"
              />
            </div>
            <ol className="mt-5 space-y-3">
              {shown.slice(0, 25).map((h, i) => {
                const v = verdict(h.match);
                return (
                  <li key={`${h.lat}-${h.lon}`} id={`kiez-h${i}`} className="rounded-3xl border-2 border-b-[5px] border-line bg-paper p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-sun text-white">
                        <span className="font-display text-lg font-extrabold leading-none">{h.match}</span>
                        <span className="text-[10px] font-semibold opacity-90">%</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted">
                          {KIND_LABEL[h.kind] ?? "Unterkunft"} · {v.label}
                        </p>
                        <h3 className="font-display text-lg font-extrabold leading-tight [overflow-wrap:anywhere]">{h.name}</h3>
                        <p className="truncate text-sm text-muted">{h.subtitle}</p>
                      </div>
                      <PlaceSaveButton
                        compact
                        place={{ name: h.name, subtitle: h.subtitle, lat: h.lat, lon: h.lon, kind: h.kind, match: h.match }}
                        initiallySaved={isSaved(h)}
                        loggedIn={Boolean(user)}
                        returnTo={`/kiez/${slug}?${query}`}
                      />
                    </div>
                    <ul className="mt-3 space-y-1">
                      {h.highlights.map((hl) => (
                        <li key={hl.text} className="flex items-center gap-2 text-sm">
                          <Icon name={hl.icon} size={18} className="text-sun" /> {hl.text}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link href={checkUrl(h)} className="flex items-center justify-center gap-1.5 rounded-xl bg-tan py-2.5 text-sm font-bold">
                        <Icon name="check" size={18} /> Lage-Details
                      </Link>
                      <a
                        href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${h.name}, Berlin`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-sm font-bold text-sand"
                      >
                        Preise <Icon name="external" size={16} />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-xs text-muted">
              Unterkünfte und Umgebung aus OpenStreetMap. Preise und Verfügbarkeit siehst du bei Booking.com.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
