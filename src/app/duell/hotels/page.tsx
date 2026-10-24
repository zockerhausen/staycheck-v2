import Link from "next/link";
import { getCities, getCriteria, getDistricts, getExtras, resolveWeights } from "@/lib/data";
import { NO_EXTRAS, personalMatch } from "@/lib/profile";
import { analyzeLocation, DEFAULT_WEIGHTS, verdict, type Place } from "@/lib/geo";
import { HUBS, cityForPoint, estimateArrival } from "@/lib/arrival";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import HotelDuelForm from "@/components/HotelDuelForm";
import DuelTabs from "@/components/DuelTabs";

// Dynamisch durch Cookies/Suchparameter; Kartendaten-Abfragen werden 1 Tag zwischengespeichert.
export const fetchCache = "default-cache";
export const maxDuration = 120;

const KINDS = ["hotel", "hostel", "guest_house", "apartment", "address", "other"] as const;

function parsePlaces(raw: string | string[] | undefined): Place[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .slice(0, 3)
    .map((h) => {
      const [lat, lon, kind, ...name] = h.split("|");
      const k = (KINDS as readonly string[]).includes(kind) ? (kind as Place["kind"]) : "other";
      return { lat: Number(lat), lon: Number(lon), kind: k, name: name.join("|").slice(0, 80) || "Unterkunft", subtitle: "" };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
}

export default async function HotelDuellPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const places = parsePlaces(params.h);

  if (places.length < 2) {
    return (
      <div className="space-y-6 pt-2">
        <DuelTabs active="hotels" />
        <div>
          <h1 className="mega text-[2.1rem]">Welche Unterkunft liegt besser?</h1>
          <p className="mt-2 text-muted">
            Du hast mehrere Unterkünfte im Blick? Füg die Links ein, wir vergleichen die Lage für dich.
          </p>
        </div>
        <HotelDuelForm initial={places} />
      </div>
    );
  }

  const [criteria, districts, cities] = await Promise.all([getCriteria(), getDistricts(), getCities()]);
  const { weights: resolved, source } = await resolveWeights(params, criteria);
  const weights = resolved ?? DEFAULT_WEIGHTS;
  const extras = resolved ? await getExtras() : NO_EXTRAS;

  // Parallel abfragen (max. 3), damit niemand lange warten muss
  type Result = { place: Place; analysis: Awaited<ReturnType<typeof analyzeLocation>> | null; match: number | null };
  const results: Result[] = await Promise.all(
    places.map(async (p) => {
      const analysis = await analyzeLocation(p.lat, p.lon, districts).catch(() => null);
      return { place: p, analysis, match: analysis ? personalMatch(analysis.scores, weights, extras).match : null };
    }),
  );
  const valid = results.filter((r) => r.analysis && r.match !== null);
  // Bei Gleichstand entscheidet der kürzere Weg zur nächsten Bahn
  const railDist = (r: Result) => r.analysis?.nearestRail?.dist ?? 99_999;
  const sorted = [...valid].sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || railDist(a) - railDist(b));
  const winner = sorted[0];
  const sameScore = sorted.length > 1 && sorted[0].match === sorted[1].match;
  const tie = sameScore && railDist(sorted[0]) === railDist(sorted[1]);
  const city = cityForPoint(places[0].lat, places[0].lon, cities);
  const airport = city ? HUBS[city.slug].find((h) => h.kind === "airport") : undefined;
  const cols = results.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className="space-y-7 pt-2">
      <DuelTabs active="hotels" />

      {winner && !tie ? (
        <section>
          <Reveal
            name={winner.place.name}
            match={winner.match ?? 0}
            celebrate
            eyebrow="Beste Lage für dich"
            caption={source ? "Match für dich" : "Lage-Score"}
            sub={sameScore ? "Gleicher Score, knapp vorne, weil die Bahn näher ist" : verdict(winner.match ?? 0).label}
          />
        </section>
      ) : (
        <section>
          <h1 className="mega text-[2.4rem]">Unentschieden!</h1>
          <p className="mt-1 text-muted">Beide liegen für dich gleich gut. Dann entscheiden Preis und Bewertungen.</p>
        </section>
      )}

      <section className="card p-4">
        <div className={`grid ${cols} gap-2 text-center`}>
          {results.map((r, i) => (
            <div key={i} className={`rounded-2xl px-2 py-3 ${r === winner && !tie ? "bg-gradient-to-br from-[#3a1c0e] to-tan outline outline-[1.5px] outline-sun" : "bg-tan"}`}>
              <p className="text-xs font-bold text-muted">#{i + 1}</p>
              <p className="line-clamp-2 text-sm font-bold leading-tight [overflow-wrap:anywhere]">{r.place.name}</p>
              <p className="mt-1 font-display text-[30px] font-extrabold leading-none">{r.match ?? "–"}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {criteria.map((c) => {
            const values = results.map((r) => r.analysis?.scores[c.key] ?? null);
            const best = Math.max(...values.map((v) => v ?? -1));
            return (
              <div key={c.key}>
                <p className="mb-1 flex items-center justify-center gap-1 text-xs font-semibold text-muted">
                  <Icon name={CRITERION_ICON[c.key]} size={16} /> {c.label}
                  {source && (weights[c.key] ?? 0) >= 4 && <span className="text-sun-soft">· wichtig für dich</span>}
                </p>
                <div className={`grid ${cols} gap-2`}>
                  {values.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                        {v !== null && (
                          <div
                            className={`h-full rounded-full ${v === best ? "bg-sun" : "bg-faint"}`}
                            style={{ width: `${v * 10}%` }}
                          />
                        )}
                      </div>
                      <span className={`w-5 text-right text-xs tabular-nums ${v === best ? "font-extrabold text-sun-soft" : "font-semibold"}`}>
                        {v ?? "–"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        {results.map((r, i) => {
          const est = airport ? estimateArrival(airport, r.place.lat, r.place.lon) : null;
          return (
            <article key={i} className="rounded-3xl bg-paper p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-sm font-bold">
                  {i + 1}
                </span>
                <h2 className="font-display text-lg font-extrabold leading-tight [overflow-wrap:anywhere]">{r.place.name}</h2>
              </div>
              {r.analysis ? (
                <ul className="mt-3 space-y-1.5">
                  {r.analysis.highlights.slice(0, 3).map((h) => (
                    <li key={h.text} className="flex items-center gap-2 text-sm">
                      <Icon name={h.icon} size={18} className="text-muted" /> {h.text}
                    </li>
                  ))}
                  {est && (
                    <li className="flex items-center gap-2 text-sm">
                      <Icon name="plane" size={18} className="text-muted" /> ca. {est.minMinutes}–{est.maxMinutes} Min. vom {airport!.name}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">Kartendaten gerade nicht erreichbar.</p>
              )}
              <Link
                href={`/check/ergebnis?${new URLSearchParams({ lat: String(r.place.lat), lon: String(r.place.lon), name: r.place.name, kind: r.place.kind })}`}
                className="mt-3 flex items-center gap-1 text-sm font-bold text-sun-soft"
              >
                <Icon name="check" size={18} /> Alle Details und Tipps
              </Link>
            </article>
          );
        })}
      </section>

      <Link href="/duell/hotels" className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
        <Icon name="refresh" size={18} /> Neues Hotel-Duell
      </Link>
    </div>
  );
}
