// Vorberechnete Städte (data/cities/*.json, erzeugt von .github/workflows/vorberechnen.yml).
// Werden zuerst genutzt – dann braucht die App für diese Städte keine fremden Kartenserver.
// Nur auf dem Server (liest Dateien).
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { distance, type Coverage, type Detail, type Highlight, type ScoreResult, type Source } from "./score";
import type { AutoCity } from "./geo";
import { blendScores, blendValue, loadInsights, nearestArea, webReason } from "./insights";
import { ZONE_KEYS } from "./zones";

export type PreSight = { n: string; lat: number; lon: number; k: string; w: number };
export type PreAirport = { n: string; iata: string; lat: number; lon: number; km: number };
export type PreHotel = {
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  kind: "hotel" | "hostel" | "guest_house" | "apartment" | "address" | "other";
  scores: Record<string, number | null>;
  highlights: Highlight[];
  stars: number; // 0 = unbekannt
  full: ScoreResult | null; // volle Bewertung (Begründungen, Datenlage) für den Lage-Check
};
export type PreCity = {
  slug: string;
  ort: string;
  land: string;
  lat: number;
  lon: number;
  radius: number;
  generated: string;
  city: AutoCity;
  hotels: PreHotel[];
  sights: PreSight[];
  airports: PreAirport[];
};

type IndexRow = { slug: string; lat: number; lon: number; radius: number };
type RawCity = Omit<PreCity, "hotels"> & { scoreKeys: string[]; hotels: [
    string,
    string,
    number,
    number,
    string,
    (number | null)[],
    Highlight[],
    number?,
    [([Source, string] | null)[], Coverage, ScoreResult["counts"], [string, number] | null]?,
  ][];
};

const DIR = path.join(process.cwd(), "data", "cities");
let index: IndexRow[] | null = null;
const cache = new Map<string, Promise<PreCity | null>>();

async function getIndex(): Promise<IndexRow[]> {
  if (index) return index;
  try {
    index = JSON.parse(await readFile(path.join(DIR, "index.json"), "utf8")) as IndexRow[];
  } catch {
    index = [];
  }
  return index;
}

function load(slug: string): Promise<PreCity | null> {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return Promise.resolve(null);
  if (!cache.has(slug)) {
    cache.set(
      slug,
      readFile(path.join(DIR, `${slug}.json.gz`))
        .then((buf) => gunzipSync(buf).toString("utf8"))
        .catch(() => readFile(path.join(DIR, `${slug}.json`), "utf8"))
        .then((txt) => {
          const raw = JSON.parse(txt) as RawCity;
          return {
            ...raw,
            hotels: raw.hotels.map(([name, subtitle, lat, lon, kind, vals, highlights, stars, full]) => {
              const scores = Object.fromEntries(raw.scoreKeys.map((k, i) => [k, vals[i]]));
              const details: Record<string, Detail> = {};
              if (full) {
                raw.scoreKeys.forEach((k, i) => {
                  const d = full[0][i];
                  if (d) details[k] = { score: vals[i], source: d[0], reasons: d[1] ? d[1].split("\u0001") : [] };
                });
              }
              return {
                name,
                subtitle,
                lat,
                lon,
                kind: kind as PreHotel["kind"],
                scores,
                highlights: highlights.slice(0, 2),
                stars: stars ?? 0,
                full: full
                  ? {
                      scores,
                      details,
                      highlights,
                      coverage: full[1],
                      counts: full[2],
                      nearestRail: full[3] ? { name: full[3][0], dist: full[3][1] } : null,
                    }
                  : null,
              };
            }),
          };
        })
        .then((city) => withInsights(city))
        .catch(() => null),
    );
  }
  return cache.get(slug)!;
}

/** Genau diese Stadt (gleicher Mittelpunkt, gleiches Raster) vorberechnet? */
export async function precomputedCity(lat: number, lon: number, radius: number): Promise<PreCity | null> {
  const row = (await getIndex()).find((c) => Math.abs(c.lat - lat) < 1e-4 && Math.abs(c.lon - lon) < 1e-4 && c.radius === radius);
  return row ? load(row.slug) : null;
}

/** Vorberechnete Stadt, die diesen Punkt abdeckt (für Unterkünfte und Lage-Checks). */
export async function precomputedCovering(lat: number, lon: number): Promise<PreCity | null> {
  const row = (await getIndex()).find((c) => distance(c.lat, c.lon, lat, lon) <= c.radius);
  return row ? load(row.slug) : null;
}

/**
 * Website-Wissen einrechnen (50/50): Raster, Viertel und Unterkünfte bekommen die gemischten Werte.
 * So nutzen Karte, Ecken, Listen und Lage-Check automatisch dieselben Zahlen.
 */
async function withInsights(city: PreCity | null): Promise<PreCity | null> {
  if (!city) return city;
  const ins = await loadInsights(city.slug);
  if (!ins?.areas.length) return city;

  const zones = city.city.zones.map((z) => {
    const a = nearestArea(ins, z.lat, z.lon);
    if (!a) return z;
    return { ...z, s: ZONE_KEYS.map((k, i) => blendValue(z.s[i], a.values[k]?.v) ?? z.s[i]) };
  });

  const districts = city.city.districts.map((d) => {
    const { scores, web } = blendScores(d.scores, nearestArea(ins, d.lat, d.lon));
    const reasons = { ...d.reasons };
    for (const [k, w] of Object.entries(web)) if (w) reasons[k] = `${reasons[k] ? `${reasons[k]}. ` : ""}${webReason(w)}`;
    return { ...d, scores, reasons };
  });

  const hotels = city.hotels.map((h) => {
    const area = nearestArea(ins, h.lat, h.lon);
    if (!area) return h;
    const { scores, web } = blendScores(h.scores, area);
    let full = h.full;
    if (full) {
      const details = { ...full.details };
      for (const [k, w] of Object.entries(web)) {
        if (!w) continue;
        const d = details[k];
        details[k] = d
          ? { ...d, score: scores[k] ?? null, source: d.source === "keine" ? "gemischt" : d.source, reasons: d.score === null ? [] : d.reasons, web: w }
          : { score: scores[k] ?? null, source: "gemischt", reasons: [], web: w };
      }
      full = { ...full, scores, details };
    }
    return { ...h, scores, full };
  });

  return { ...city, city: { ...city.city, zones, districts }, hotels };
}
