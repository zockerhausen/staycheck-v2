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
import { HUBS, cityForPoint } from "@/lib/arrival";
import { getTipsNear } from "@/lib/tips";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  top: "bg-sun text-white",
  good: "bg-peach text-peach-ink",
  ok: "bg-tan text-ink",
  low: "bg-ink text-sand",
};

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
        <h1 className="mt-4 font-display text-3xl font-extrabold">Kartendaten gerade nicht erreichbar</h1>
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
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <Link href="/check" className="flex items-center gap-1 text-sm font-semibold text-muted">
          <Icon name="back" size={18} /> Neue Suche
        </Link>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${TONE[v.tone]}`}>{v.label}</span>
      </div>

      <section>
        <Reveal name={name} match={match} celebrate={match >= 64} eyebrow="Lage-Check" caption={source ? "passt zu dir" : "Lage-Score"} />
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {strengths.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1.5 text-sm font-semibold text-peach-ink">
              <Icon name={CRITERION_ICON[c.key]} size={18} fill="#fff" /> {c.label}
            </span>
          ))}
          {weakness && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tan px-3 py-1.5 text-sm font-semibold text-muted">
              <Icon name={CRITERION_ICON[weakness.key]} size={18} fill="#fffaf1" /> schwach: {weakness.label}
            </span>
          )}
        </div>
      </section>

      <ul className="space-y-2">
        {analysis.highlights.map((h) => (
          <li key={h.text} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3">
            <Icon name={h.icon} size={26} className="text-sun" />
            <span className="font-medium">{h.text}</span>
          </li>
        ))}
      </ul>

      <section className="rounded-3xl border-2 border-b-[5px] border-line bg-paper p-5">
        <h2 className="font-display text-xl font-bold">Die Lage im Detail</h2>
        <dl className="mt-3 space-y-2">
          {criteria.map((c) => {
            const s = analysis.scores[c.key];
            return (
              <div key={c.key} className="flex items-center gap-2 text-sm">
                <dt className="flex w-32 shrink-0 items-center gap-1.5 text-muted">
                  <Icon name={CRITERION_ICON[c.key]} size={18} /> {c.label}
                </dt>
                <dd className="h-2.5 flex-1 overflow-hidden rounded-full bg-tan">
                  {s !== null && <div className="h-full rounded-full bg-sun" style={{ width: `${s * 10}%` }} />}
                </dd>
                <span className="w-12 text-right font-semibold tabular-nums">{s ?? "k. A."}</span>
              </div>
            );
          })}
        </dl>
        <p className="mt-3 text-xs text-muted">
          Quelle: OpenStreetMap im Umkreis von 500–900 m.
          {district ? ` Sicherheit und Budget aus unserer Bewertung für ${district.name}.` : " Für Sicherheit haben wir hier noch keine Daten."}
        </p>
      </section>

      <KiezMap
        points={[{ slug: "ort", name, lat, lng: lon, match }]}
        highlight="ort"
        center={[lon, lat]}
        zoom={14.5}
        height="h-56"
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
        <PlaceSaveButton
          place={{ name, subtitle: sub, lat, lon, kind, match }}
          initiallySaved={isSaved}
          loggedIn={Boolean(user)}
          returnTo={returnTo}
        />
        {district && (
          <Link href={`/kiez/${district.slug}?stadt=${district.city}${amp}`} className="btn-chunky w-full">
            <Icon name="hotel" size={22} fill="#ffcfa8" /> Bessere Hotels in {district.name}
          </Link>
        )}
        <Link
          href={`/duell/hotels?h=${encodeURIComponent([lat.toFixed(6), lon.toFixed(6), kind, name.slice(0, 80)].join("|"))}`}
          className="btn-chunky btn-chunky-light w-full"
        >
          <Icon name="duel" size={22} /> Mit anderem Hotel vergleichen
        </Link>
        <Link href="/check" className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-muted">
          <Icon name="refresh" size={18} /> Anderes Hotel prüfen
        </Link>
      </div>
    </div>
  );
}
