import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCities,
  getCriteria,
  getDistricts,
  getSavedPlaces,
  getUser,
  resolveWeights,
  weightsToQuery,
} from "@/lib/data";
import { analyzeLocation, DEFAULT_WEIGHTS, locationMatch, verdict } from "@/lib/geo";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import KiezMap from "@/components/KiezMap";
import PlaceSaveButton from "@/components/PlaceSaveButton";
import ArrivalCard from "@/components/ArrivalCard";
import TipsSection from "@/components/TipsSection";
import { RememberCheck } from "@/components/RecentChecks";
import ScoreExplain from "@/components/ScoreExplain";
import { HUBS, cityForPoint } from "@/lib/arrival";
import { getTipsNear } from "@/lib/tips";

// Dynamisch durch Cookies/Suchparameter; Kartendaten-Abfragen werden 1 Tag zwischengespeichert.
export const fetchCache = "default-cache";

export default async function CheckErgebnisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const lat = Number(get("lat"));
  const lon = Number(get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !get("lat")) redirect("/check");
  const name = get("name").slice(0, 120) || "Dein Ort";
  const sub = get("sub").slice(0, 200);
  const kind = get("kind") || "other";

  const [criteria, districts, user, saved, cities, tips] = await Promise.all([
    getCriteria(),
    getDistricts(),
    getUser(),
    getSavedPlaces(),
    getCities(),
    getTipsNear(lat, lon),
  ]);
  const city = cityForPoint(lat, lon, cities);
  const { weights: resolved, source } = await resolveWeights(params, criteria);
  const weights = resolved ?? DEFAULT_WEIGHTS;

  const analysis = await analyzeLocation(lat, lon, districts).catch(() => null);
  if (!analysis) {
    return (
      <div className="pt-10 text-center">
        <Icon name="map" size={56} className="mx-auto text-sun" />
        <h1 className="mega mt-4 text-[2.1rem]">Kartendaten gerade nicht erreichbar</h1>
        <p className="mt-2 text-muted">Der Kartendienst ist überlastet. Versuch es in einer Minute nochmal.</p>
        <Link href="/check" className="btn-chunky mt-6 w-full">
          Zurück zur Suche
        </Link>
      </div>
    );
  }

  const match = locationMatch(analysis.scores, weights);
  const v = verdict(match);
  const query = source === "url" ? weightsToQuery(weights) : "";
  const amp = query ? `&${query}` : "";
  const district = analysis.district;
  const isSaved = saved.some((p) => Math.abs(p.lat - lat) < 1e-6 && Math.abs(p.lon - lon) < 1e-6);
  const returnTo = `/check/ergebnis?${new URLSearchParams({ lat: String(lat), lon: String(lon), name, sub, kind })}${amp}`;

  // Stärken und Schwächen für diesen Nutzer
  const weighted = criteria
    .filter((c) => (weights[c.key] ?? 0) > 0 && analysis.scores[c.key] !== null)
    .map((c) => ({ ...c, score: analysis.scores[c.key] as number, w: weights[c.key] }));
  const strengths = [...weighted].sort((a, b) => b.score * b.w - a.score * a.w).slice(0, 2);
  const weakness = [...weighted].filter((c) => c.score <= 4).sort((a, b) => b.w - a.w)[0];

  return (
    <div className="fade-up space-y-7">
      <RememberCheck name={name} sub={sub} lat={lat} lon={lon} kind={kind} match={match} label={v.label} />
      <div className="flex items-center justify-between">
        <Link href="/check" aria-label="Neue Suche" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
          <Icon name="back" size={18} />
        </Link>
        <span className="text-base font-bold">Lage-Check</span>
        <span className="h-11 w-11" />
      </div>

      <section>
        <Reveal name={name} match={match} celebrate={match >= 64} eyebrow={v.label} caption={source ? "Match für dich" : "Lage-Score"} sub={sub} />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {strengths.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1.5 text-sm font-bold text-peach-ink">
              <Icon name={CRITERION_ICON[c.key]} size={16} /> {c.label}
            </span>
          ))}
          {weakness && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tan px-3 py-1.5 text-sm font-semibold text-muted">
              <Icon name={CRITERION_ICON[weakness.key]} size={16} /> schwach: {weakness.label}
            </span>
          )}
        </div>
      </section>

      <KiezMap
        points={[{ slug: "ort", name, lat, lng: lon, match }]}
        highlight="ort"
        center={[lon, lat]}
        zoom={14.5}
        height="h-56"
      />

      <ul className="card px-4">
        {analysis.highlights.map((h) => (
          <li key={h.text} className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-0">
            <Icon name={h.icon} size={22} className="text-muted" />
            <span className="text-[15px] font-semibold">{h.text}</span>
          </li>
        ))}
      </ul>

      {district && (
        <Link href={`/kiez/${district.slug}?stadt=${district.city}${amp}`} className="card press flex items-center gap-3.5 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
            <Icon name="map" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Liegt in {district.name}</span>
            <span className="block truncate text-sm text-muted">Bessere Unterkünfte im Viertel ansehen</span>
          </span>
          <Icon name="chevron" size={16} className="text-faint" />
        </Link>
      )}

      <ScoreExplain
        criteria={criteria}
        details={analysis.details}
        weights={weights}
        match={match}
        coverage={analysis.coverage}
        personal={Boolean(source)}
      />

      {city && <ArrivalCard hubs={HUBS[city.slug]} lat={lat} lon={lon} nearestRail={analysis.nearestRail} />}

      <TipsSection
        tips={tips}
        userId={user?.id ?? null}
        lat={lat}
        lon={lon}
        placeName={name}
        districtId={district?.id ?? null}
        returnTo={returnTo}
        title="Tipps zu dieser Lage"
      />

      <div className="space-y-3">
        <a
          href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${name} ${sub.split(",").slice(-2).join(" ")}`.trim().slice(0, 160))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 font-bold text-sand"
        >
          <Icon name="external" size={18} /> Bei Booking ansehen
        </a>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/duell/hotels?h=${encodeURIComponent([lat.toFixed(6), lon.toFixed(6), kind, name.slice(0, 80)].join("|"))}`}
            className="press flex items-center justify-center gap-2 rounded-full bg-tan py-4 font-bold"
          >
            <Icon name="duel" size={18} /> Vergleichen
          </Link>
          <PlaceSaveButton
            place={{ name, subtitle: sub, lat, lon, kind, match }}
            initiallySaved={isSaved}
            loggedIn={Boolean(user)}
            returnTo={returnTo}
          />
        </div>
        <Link href="/check" className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-muted">
          <Icon name="refresh" size={18} /> Andere Unterkunft prüfen
        </Link>
      </div>
    </div>
  );
}
