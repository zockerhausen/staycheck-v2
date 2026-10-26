// Vorberechnete Städte (data/cities/*.json, erzeugt von .github/workflows/vorberechnen.yml).
// Werden zuerst genutzt – dann braucht die App für diese Städte keine fremden Kartenserver.
// Nur auf dem Server (liest Dateien).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { distance, type Highlight } from "./score";
import type { AutoCity } from "./geo";

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
type RawCity = Omit<PreCity, "hotels"> & { scoreKeys: string[]; hotels: [string, string, number, number, string, (number | null)[], Highlight[]][] };

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
      readFile(path.join(DIR, `${slug}.json`), "utf8")
        .then((txt) => {
          const raw = JSON.parse(txt) as RawCity;
          return {
            ...raw,
            hotels: raw.hotels.map(([name, subtitle, lat, lon, kind, vals, highlights]) => ({
              name,
              subtitle,
              lat,
              lon,
              kind: kind as PreHotel["kind"],
              scores: Object.fromEntries(raw.scoreKeys.map((k, i) => [k, vals[i]])),
              highlights,
            })),
          };
        })
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
