// Lage-Analyse mit kostenlosen OpenStreetMap-Daten.
// - Suche/Geocoding: Photon (photon.komoot.io), erlaubt Suche beim Tippen
// - Umgebung (Bars, Bahn, Parks, Hotels …): Overpass API
// Funktioniert weltweit. Sicherheit kommt aus unseren Kiez-Bewertungen (nur dort, wo wir sie haben).

import type { District, Weights } from "./data";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { pickZones, ZONE_KEYS, type ZonePoint } from "./zones";
import { precomputedCity, precomputedCovering } from "./precomputed";
import { distance, scoreFromData, type Highlight, type Line, type Poi, type ScoreResult } from "./score";

const UA = "StayCheck/0.1 (https://github.com/zockerhausen/staycheck-v2)";
// Kartendaten-Server. Im Moment die freien öffentlichen Server.
// Später eigener Server: in Vercel die Umgebungsvariable OVERPASS_URL setzen (nur https), dann wird er zuerst gefragt.
const OWN_OVERPASS = /^https:\/\/[^\s]+$/.test(process.env.OVERPASS_URL ?? "") ? (process.env.OVERPASS_URL as string) : null;
const OVERPASS_FAST = OWN_OVERPASS ? [OWN_OVERPASS] : ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
const OVERPASS_FALLBACK = OWN_OVERPASS ? "https://overpass-api.de/api/interpreter" : "https://overpass.private.coffee/api/interpreter";

export type Place = {
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  kind: "hotel" | "hostel" | "guest_house" | "apartment" | "address" | "other";
};

export type LocationScores = Record<string, number | null>; // null = keine Daten
export type { Highlight, Detail, Coverage } from "./score";

export type LocationAnalysis = ScoreResult & { district: District | null };

// ---------- Hilfsfunktionen ----------

export { distance } from "./score";

function kindOf(tags: Record<string, string> | undefined): Place["kind"] {
  const t = tags?.tourism ?? "";
  if (t === "hotel" || t === "hostel" || t === "guest_house" || t === "apartment") return t;
  return tags?.["addr:street"] || tags?.housenumber ? "address" : "other";
}

// ---------- Suche ----------

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

export async function searchPlaces(query: string, near?: { lat: number; lon: number }): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "7");
  url.searchParams.set("lang", "de");
  if (near) {
    url.searchParams.set("lat", String(near.lat));
    url.searchParams.set("lon", String(near.lon));
  }
  const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 86400 } });
  if (!res.ok) return [];
  const json = (await res.json()) as { features: PhotonFeature[] };

  return json.features.map((f) => {
    const p = f.properties;
    const street = [p.street, p.housenumber].filter(Boolean).join(" ");
    const name = p.name ?? (street || p.city || "Ort");
    const subtitle = [p.name ? street : "", p.district ?? p.locality, p.city, p.country].filter(Boolean).join(", ");
    const kind: Place["kind"] =
      p.osm_key === "tourism" && ["hotel", "hostel", "guest_house", "apartment"].includes(p.osm_value ?? "")
        ? (p.osm_value as Place["kind"])
        : p.housenumber
          ? "address"
          : "other";
    return { name, subtitle, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], kind };
  });
}

// ---------- Overpass ----------

export type OverpassElement = {
  type: string;
  lat?: number;
  lon?: number;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  members?: { role?: string; geometry?: { lat: number; lon: number }[] }[];
  tags?: Record<string, string>;
};

// Die öffentlichen Overpass-Server erlauben pro Absender nur wenige Anfragen gleichzeitig.
// Mehr gleichzeitig führt zu Sperren (429) für alle. Deshalb höchstens 2 Abfragen pro Server-Instanz auf einmal,
// der Rest wartet in einer Schlange.
const MAX_PARALLEL = 2;
let running = 0;
const queue: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => queue.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

function overpass(query: string): Promise<OverpassElement[]> {
  return withSlot(() => overpassNow(query));
}

async function overpassNow(query: string): Promise<OverpassElement[]> {
  // Die öffentlichen Overpass-Server sind oft ausgelastet. Wir fragen zwei gleichzeitig
  // und nehmen die erste gute Antwort; der dritte springt ein, wenn beide scheitern.
  const ask = async (endpoint: string, signal: AbortSignal) => {
    const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA },
      signal,
      next: { revalidate: 86400 }, // 1 Tag zwischenspeichern (wenn die Antwort klein genug ist)
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
    if (!json.elements || (json.remark && /runtime error|timed out|out of memory/i.test(json.remark))) throw new Error("Overpass unvollständig");
    return json.elements;
  };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 50_000);
  try {
    return await Promise.any(OVERPASS_FAST.map((e) => ask(e, ctl.signal)));
  } catch {
    return await ask(OVERPASS_FALLBACK, AbortSignal.timeout(40_000));
  } finally {
    clearTimeout(timer);
    ctl.abort(); // die langsamere Anfrage abbrechen
  }
}

/** Fläche eines Umrisses in m² (Gaußsche Trapezformel, lokal in Metern) */
function polygonArea(pts: { lat: number; lon: number }[]) {
  if (pts.length < 3) return 0;
  const lat0 = pts[0].lat;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += (a.lon * kx) * (b.lat * ky) - (b.lon * kx) * (a.lat * ky);
  }
  return Math.abs(sum) / 2;
}

/** Overpass-Antwort → Punkte (mit Umriss bei Flächen) und Linien (Straßen, Gleise) */
export function split(elements: OverpassElement[]): { pois: Poi[]; lines: Line[] } {
  const pois: Poi[] = [];
  const lines: Line[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    if (e.geometry && e.geometry.length > 1 && (tags.highway || tags.railway)) {
      lines.push({ tags, points: e.geometry.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)) });
    } else if (e.geometry && e.geometry.length > 2) {
      // Fläche mit echtem Umriss (Park, See …): echte Größe statt Rechteck
      const pts = e.geometry.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
      const lats = pts.map((p) => p.lat);
      const lons = pts.map((p) => p.lon);
      const bbox: [number, number, number, number] = [Math.min(...lats), Math.min(...lons), Math.max(...lats), Math.max(...lons)];
      pois.push({ lat: (bbox[0] + bbox[2]) / 2, lon: (bbox[1] + bbox[3]) / 2, tags, bbox, area: polygonArea(pts) });
    } else if (e.type === "relation" && e.members?.length && e.bounds) {
      // Fläche aus mehreren Teilen: nur geschlossene Außenringe zählen wir genau, sonst Schätzung über das Rechteck
      const outers = e.members.filter((m) => m.role === "outer" && m.geometry && m.geometry.length > 3);
      const closed = outers.every((m) => {
        const g = m.geometry!;
        return Math.abs(g[0].lat - g[g.length - 1].lat) < 1e-7 && Math.abs(g[0].lon - g[g.length - 1].lon) < 1e-7;
      });
      const { minlat, minlon, maxlat, maxlon } = e.bounds;
      const area = outers.length && closed ? outers.reduce((sum, m) => sum + polygonArea(m.geometry!), 0) : undefined;
      pois.push({ lat: (minlat + maxlat) / 2, lon: (minlon + maxlon) / 2, tags, bbox: [minlat, minlon, maxlat, maxlon], area });
    } else if (Number.isFinite(e.lat) && Number.isFinite(e.lon)) {
      pois.push({ lat: e.lat as number, lon: e.lon as number, tags });
    } else if (e.center && Number.isFinite(e.center.lat)) {
      pois.push({ lat: e.center.lat, lon: e.center.lon, tags });
    } else if (e.bounds) {
      const { minlat, minlon, maxlat, maxlon } = e.bounds;
      pois.push({ lat: (minlat + maxlat) / 2, lon: (minlon + maxlon) / 2, tags, bbox: [minlat, minlon, maxlat, maxlon] });
    }
  }
  return { pois, lines };
}

/**
 * Alles, was der Score braucht, in einer Abfrage.
 * extra = zusätzlicher Radius (für ein ganzes Viertel mit vielen Unterkünften).
 */
function poiQuery(lat: number, lon: number, extra = 0) {
  const c = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const a = (r: number) => `around:${r + extra},${c}`;
  // Nebenstraßen nur beim Einzel-Check, sonst wird die Antwort für ein ganzes Viertel zu groß
  // Geschäfte (nur für die Datenlage) und Nebenstraßen nur beim Einzel-Check, sonst wird die Antwort
  // für ein ganzes Viertel in dichten Altstädten riesig
  const secondary = extra === 0 ? `way(${a(40)})[highway=secondary];` : "";
  // Beim Einzel-Check echte Park-Umrisse (genaue Größe), fürs ganze Viertel nur Rechtecke (kleinere Antwort)
  const greenOut = extra === 0 ? "out tags geom;" : "out tags bb;";
  const relGreen = `rel(${a(800)})[leisure~"^(park|garden|nature_reserve)$"];rel(${a(800)})[natural~"^(water|wood)$"];rel(${a(800)})[landuse=forest];`;
  return `[out:json][timeout:25];
(
  nwr(${a(600)})[amenity~"^(bar|pub|nightclub|biergarten)$"];
  nwr(${a(500)})[amenity~"^(restaurant|cafe|fast_food|food_court)$"];
  node(${a(900)})[railway~"^(station|halt|tram_stop)$"];
  node(${a(900)})[public_transport=station];
  node(${a(400)})[highway=bus_stop];
  node(${a(800)})[natural=beach];
  ${extra === 0 ? "" : relGreen}
  node(${a(600)})[amenity=ferry_terminal];
  nwr(${a(800)})[tourism~"^(hostel|guest_house)$"];
  ${extra === 0 ? `nwr(${a(500)})[shop];` : ""}
  nwr(${a(600)})[shop~"^(supermarket|convenience|laundry)$"];
  nwr(${a(600)})[amenity=coworking_space];
  nwr(${a(600)})[office=coworking];
  nwr(${a(800)})[leisure=fitness_centre];
  nwr(${a(800)})[tourism~"^(attraction|museum|viewpoint|gallery|zoo)$"];
  nwr(${a(800)})[historic~"^(monument|castle|ruins|city_gate|archaeological_site)$"];
);
out tags bb;
(
  way(${a(130)})[highway~"^(motorway|trunk|primary)$"];
  ${secondary}
  way(${a(160)})[railway~"^(rail|light_rail|subway|tram)$"]["tunnel"!="yes"];
);
out tags geom;
(
  way(${a(800)})[leisure~"^(park|garden|nature_reserve)$"];
  way(${a(800)})[natural~"^(water|beach|wood)$"];
  way(${a(800)})[landuse=forest];
  ${extra === 0 ? relGreen : ""}
);
${greenOut}`;
}

/** Nächstgelegener Kiez (nur wenn wir für die Stadt Kiez-Daten haben und er nah genug ist). */
export function nearestDistrict(lat: number, lon: number, districts: District[]): District | null {
  let best: District | null = null;
  let bestDist = Infinity;
  for (const d of districts) {
    if (d.lat === null || d.lng === null) continue;
    const dist = distance(lat, lon, d.lat, d.lng);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return bestDist < 4000 ? best : null;
}

export function scoreLocation(lat: number, lon: number, data: { pois: Poi[]; lines: Line[] }, district: District | null): LocationAnalysis {
  const r = scoreFromData(lat, lon, data.pois, data.lines, district ? { name: district.name, scores: district.scores } : null);
  return { ...r, district };
}

// Das fertige Ergebnis ist klein und wird 1 Tag gespeichert – die Rohdaten sind oft zu groß für den Zwischenspeicher.
const scoreCached = unstable_cache(
  async (lat: number, lon: number, district: { name: string; scores: Record<string, number> } | null) => {
    const { pois, lines } = split(await overpass(poiQuery(lat, lon)));
    return scoreFromData(lat, lon, pois, lines, district);
  },
  ["score-v2"],
  { revalidate: 86400 },
);

export async function analyzeLocation(lat: number, lon: number, districts: District[]): Promise<LocationAnalysis> {
  const la = Math.round(lat * 1e5) / 1e5;
  const lo = Math.round(lon * 1e5) / 1e5;
  const district = nearestDistrict(la, lo, districts);
  const r = await once(`score:${la},${lo}`, () => scoreCached(la, lo, district ? { name: district.name, scores: district.scores } : null));
  return { ...r, district };
}

/** Match in Prozent für einen Ort. Kriterien ohne Daten (null) werden ignoriert. */
export function locationMatch(scores: LocationScores, weights: Weights) {
  let sum = 0;
  let max = 0;
  for (const [k, w] of Object.entries(weights)) {
    const s = scores[k];
    if (w <= 0 || s === null || s === undefined) continue;
    sum += w * s;
    max += w * 10;
  }
  return max ? Math.round((sum / max) * 100) : 0;
}

export function verdict(match: number) {
  if (match >= 78) return { label: "Top-Lage", tone: "top" as const };
  if (match >= 64) return { label: "Gute Lage", tone: "good" as const };
  if (match >= 50) return { label: "Geht so", tone: "ok" as const };
  return { label: "Eher abseits", tone: "low" as const };
}

export const DEFAULT_WEIGHTS: Weights = { budget: 3, nightlife: 3, quiet: 3, safety: 3, transit: 4, food: 3, nature: 2 };

// ---------- Hotels in einem Kiez ----------

export type HotelResult = Place & { scores: LocationScores; match: number; highlights: Highlight[] };

/**
 * Alle Unterkünfte im Umkreis mit ihren Lage-Werten. Unabhängig vom Reise-Profil,
 * damit das (langsame) Ergebnis für alle Nutzer:innen gleich ist und nur einmal berechnet werden muss.
 */
async function hotelsScored(
  center: { lat: number; lon: number },
  district: District | null,
  radius: number,
  areaName: string,
): Promise<HotelResult[]> {
  const c = `${center.lat.toFixed(5)},${center.lon.toFixed(5)}`;
  const hotelsQuery = `[out:json][timeout:25];
nwr(around:${radius},${c})[tourism~"^(hotel|hostel|guest_house|apartment)$"][name];
out tags center;`;
  const [hotelEls, raw] = await Promise.all([overpass(hotelsQuery), overpass(poiQuery(center.lat, center.lon, radius))]);
  return hotelsFromData(split(hotelEls).pois, split(raw), district, areaName)
}

/** Rechenteil: Unterkünfte mit Lage-Werten aus fertigen Kartendaten (auch für die Vorberechnung). */
export function hotelsFromData(hotels: Poi[], data: { pois: Poi[]; lines: Line[] }, district: District | null, areaName: string, limit = 150) {
  return hotels
    .map((h) => {
      const a = scoreLocation(h.lat, h.lon, data, district);
      const street = [h.tags["addr:street"], h.tags["addr:housenumber"]].filter(Boolean).join(" ");
      return {
        name: h.tags.name,
        subtitle: street || areaName,
        lat: h.lat,
        lon: h.lon,
        kind: kindOf(h.tags),
        scores: a.scores,
        match: locationMatch(a.scores, DEFAULT_WEIGHTS),
        highlights: a.highlights.slice(0, 2),
      };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, limit); // genug Auswahl, damit jedes Profil seine besten findet
}

/** Nach dem Reise-Profil sortieren (schnell, läuft bei jedem Aufruf). */
function rankHotels(list: HotelResult[], weights: Weights): HotelResult[] {
  return list
    .map((h) => ({ ...h, match: locationMatch(h.scores, weights) }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 40);
}

export async function hotelsNear(
  center: { lat: number; lon: number },
  district: District | null,
  weights: Weights,
  radius = 1400,
  areaName = district?.name ?? "",
): Promise<HotelResult[]> {
  return rankHotels(await hotelsScored(center, district, radius, areaName), weights);
}

// ---------- Viertel für jede Stadt der Welt (automatisch) ----------
// Für Städte ohne unsere Handbewertung: Stadtteile aus OpenStreetMap, je Stadtteil gezählt,
// was im Umkreis liegt. Gröber als der Lage-Check einer Adresse – das zeigen wir auch so an.

export type Zone = { lat: number; lon: number; s: number[] }; // s: Werte in der Reihenfolge ZONE_KEYS
export type NamedPlace = { n: string; lat: number; lon: number; l: number }; // l: 0 Stadtteil, 1 Quartier, 2 Kiez
export type AutoCity = { districts: AutoDistrict[]; zones: Zone[]; step: number; places?: NamedPlace[] };

export type AutoDistrict = {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  distKm: number;
  scores: Record<string, number | null>;
  reasons: Record<string, string>;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "viertel";

const autoStep = (v: number, table: [number, number][], fallback: number) => {
  for (const [limit, score] of table) if (v <= limit) return score;
  return fallback;
};

/** Viertel einer Stadt plus ein feines Raster („Zonen“) für die Karte, aus denselben Kartendaten. */
export async function autoCity(lat: number, lon: number, radius = 3500, max = 14): Promise<AutoCity> {
  const c = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  // Beide Abfragen laufen gleichzeitig (die öffentlichen Server antworten oft langsam).
  // 1) Stadtteile (Punkte mit Namen)  2) alles Nötige im Rechteck um das Zentrum, ohne Details
  const dLat = radius / 110540 + 0.006;
  const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180)) + 0.009;
  // Große Gebiete (z. B. Berlin mit 6 km) in 2×2 Stücke teilen: eine Riesen-Abfrage brechen die Server sonst ab
  const n = radius > 4000 ? 2 : 1;
  const tiles: string[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const s0 = lat - dLat + (2 * dLat * i) / n;
      const w0 = lon - dLon + (2 * dLon * j) / n;
      tiles.push(`${s0.toFixed(4)},${w0.toFixed(4)},${(s0 + (2 * dLat) / n).toFixed(4)},${(w0 + (2 * dLon) / n).toFixed(4)}`);
    }
  const catsFor = (bb: string): [string, string][] => [
    [`node(${bb})[amenity~"^(bar|pub|nightclub|biergarten)$"]`, `way(${bb})[amenity~"^(bar|pub|nightclub|biergarten)$"]`],
    [`node(${bb})[amenity~"^(restaurant|cafe|fast_food|food_court)$"]`, `way(${bb})[amenity~"^(restaurant|cafe|fast_food|food_court)$"]`],
    [`node(${bb})[railway~"^(station|halt)$"]`, ""],
    [`node(${bb})[railway=tram_stop]`, ""],
    [`node(${bb})[highway=bus_stop]`, ""],
    ["", `way(${bb})[leisure=park]`],
    [`node(${bb})[tourism~"^(hostel|guest_house)$"]`, `way(${bb})[tourism~"^(hostel|guest_house)$"]`],
  ];
  const CATS = 7;
  // Punkte nur mit Koordinaten (skel), Flächen nur mit Mittelpunkt (center) – hält die Antwort klein
  const part = (bb: string, i: number) => {
    const [nq, w] = catsFor(bb)[i];
    return `${nq ? `${nq};out skel qt;` : ""}${w ? `${w};out center qt;` : ""}make sep n="${i}";out;`;
  };
  const ask = (bb: string, idx: number[]) => overpass(`[out:json][timeout:50];${idx.map((i) => part(bb, i)).join("")}`);
  const FOOD = [1];
  const REST = [0, 2, 3, 4, 5, 6];
  const [places, ...tileEls] = await Promise.all([
    overpass(`[out:json][timeout:25];node(around:${radius},${c})[place~"^(suburb|quarter|neighbourhood)$"][name];out;`),
    ...tiles.flatMap((bb) => [ask(bb, FOOD), ask(bb, REST)]),
  ]);

  const groups: { lat: number; lon: number }[][] = Array.from({ length: CATS }, () => []);
  const seen = Array.from({ length: CATS }, () => new Set<string>()); // Flächen an Stück-Grenzen nicht doppelt zählen
  for (const [k, els] of tileEls.entries()) {
    const order = k % 2 === 0 ? FOOD : REST;
    let pos = 0;
    for (const e of els) {
      if (e.type === "sep") {
        pos += 1;
        continue;
      }
      const g = order[pos];
      const la = e.lat ?? e.center?.lat;
      const lo = e.lon ?? e.center?.lon;
      if (g === undefined || !Number.isFinite(la) || !Number.isFinite(lo)) continue;
      const id = `${e.type}:${la},${lo}`;
      if (seen[g].has(id)) continue;
      seen[g].add(id);
      groups[g].push({ lat: la as number, lon: lo as number });
    }
  }
  return autoCityFromData(lat, lon, radius, max, places, groups);
}

/**
 * Der Rechenteil von autoCity, getrennt vom Abfragen: bekommt benannte Orte und die gezählten Punkte
 * (Reihenfolge wie RADII). So rechnet die Vorberechnung über GitHub mit heruntergeladenen Kartendaten genau gleich.
 */
export function autoCityFromData(
  lat: number,
  lon: number,
  radius: number,
  max: number,
  places: OverpassElement[],
  groups: { lat: number; lon: number }[][],
): AutoCity {
  const rank: Record<string, number> = { suburb: 0, quarter: 1, neighbourhood: 2 };
  const candidates = places
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.tags?.name)
    .map((p) => ({
      name: p.tags!["name:de"] ?? p.tags!["name:en"] ?? p.tags!.name,
      lat: p.lat as number,
      lon: p.lon as number,
      level: rank[p.tags!.place] ?? 3,
      d: distance(lat, lon, p.lat as number, p.lon as number),
    }))
    .filter((p) => /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]+$/u.test(p.name)) // nur lesbare Namen
    // Nähe zum Zentrum zählt am meisten; größere Stadtteile leicht bevorzugt
    .sort((a, b) => a.d + a.level * 700 - (b.d + b.level * 700));

  // Gleichmäßig verteilt: keine zwei Viertel näher als 900 m beieinander
  const picked: typeof candidates = [];
  for (const p of candidates) {
    if (picked.length >= max) break;
    if (picked.some((q) => distance(p.lat, p.lon, q.lat, q.lon) < 900)) continue;
    picked.push(p);
  }

  // Punkte in Kacheln (ca. 1 km) einsortieren, damit das Zählen auch für hunderte Rasterpunkte schnell bleibt
  const CELL = 0.01;
  const buckets = groups.map((g) => {
    const m = new Map<string, { lat: number; lon: number }[]>();
    for (const x of g) {
      const k = `${Math.floor(x.lat / CELL)}:${Math.floor(x.lon / CELL)}`;
      const list = m.get(k);
      if (list) list.push(x);
      else m.set(k, [x]);
    }
    return m;
  });
  const within = (g: number, p: { lat: number; lon: number }, r: number) => {
    let n = 0;
    const bi = Math.floor(p.lat / CELL);
    const bj = Math.floor(p.lon / CELL);
    for (let i = bi - 1; i <= bi + 1; i++)
      for (let j = bj - 1; j <= bj + 1; j++)
        for (const x of buckets[g].get(`${i}:${j}`) ?? []) if (distance(p.lat, p.lon, x.lat, x.lon) <= r) n++;
    return n;
  };
  const RADII = [600, 500, 800, 400, 400, 700, 900];
  const countsAt = (p: { lat: number; lon: number }) => RADII.map((r, g) => within(g, p, r));

  const districts = picked
    .map((p) => {
      const c7 = countsAt(p);
      const [bars, food, stations, trams, buses, parks, hostels] = c7;
      const scores = autoScores(c7);
      const reasons: Record<string, string> = {
        transit: stations
          ? `${stations} Bahnhof/Bahnhöfe in 800 m`
          : trams
            ? `Straßenbahn in 400 m, kein Bahnhof in 800 m`
            : `${buses} Bushaltestelle(n) in 400 m, keine Bahn`,
        nightlife: `${bars} Bars und Clubs in 600 m`,
        food: `${food} Restaurants und Cafés in 500 m`,
        nature: `${parks} Park(s) in 700 m`,
        quiet: "Grob geschätzt: je mehr Bars und Restaurants, desto lauter",
        budget: `${hostels} Hostels und Pensionen in 900 m`,
        safety: "Für diese Stadt haben wir keine Einschätzung",
      };
      return { slug: slugify(p.name), name: p.name, lat: p.lat, lon: p.lon, distKm: Math.round(p.d / 100) / 10, scores, reasons };
    })
    .filter((d) => (d.scores.food ?? 0) >= 3 || (d.scores.transit ?? 0) >= 6); // Viertel ohne alles weglassen

  // Raster: alle ~350 m ein Punkt im Kreis um das Zentrum. Punkte ohne alles (Wasser, Felder) fallen weg.
  const STEP = 350;
  const zones: Zone[] = [];
  const nLat = Math.ceil(radius / STEP);
  const mLat = STEP / 110540;
  const mLon = STEP / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = -nLat; i <= nLat; i++) {
    for (let j = -nLat; j <= nLat; j++) {
      const p = { lat: lat + i * mLat, lon: lon + j * mLon };
      if (distance(lat, lon, p.lat, p.lon) > radius) continue;
      const sc = autoScores(countsAt(p));
      if ((sc.food ?? 0) < 3 && (sc.transit ?? 0) < 6) continue;
      zones.push({
        lat: Math.round(p.lat * 1e5) / 1e5,
        lon: Math.round(p.lon * 1e5) / 1e5,
        s: ZONE_KEYS.map((k) => Math.round((sc[k] ?? 0) * 10) / 10),
      });
    }
  }
  // Namen von Stadtteilen und Kiezen, um kleine Ecken zu benennen (die nächsten 250)
  const named: NamedPlace[] = [...candidates]
    .sort((a, b) => a.d - b.d)
    .slice(0, 250)
    .map((p) => ({ n: p.name.slice(0, 60), lat: Math.round(p.lat * 1e5) / 1e5, lon: Math.round(p.lon * 1e5) / 1e5, l: p.level }));
  return { districts, zones, step: STEP, places: named };
}

/** Werte aus den gezählten Dingen (Reihenfolge wie RADII). Gleiche Formeln für Viertel und Raster. */
function autoScores([bars, food, stations, trams, buses, parks, hostels]: number[]): Record<string, number | null> {
  const transit = stations >= 3 ? 10 : stations === 2 ? 9 : stations === 1 ? 8 : trams > 0 ? 6 : buses >= 3 ? 4 : buses > 0 ? 3 : 1;
  // Logarithmische Skala: 10 → 25 → 100 → 200 Lokale machen jeweils einen spürbaren Unterschied,
  // statt dass alles ab 20 bei 10 von 10 hängen bleibt. Eine Nachkommastelle, damit Viertel vergleichbar bleiben.
  const log = (n: number, k: number, base = 1) => Math.min(10, Math.max(1, Math.round((base + Math.log2(1 + n) * k) * 10) / 10));
  return {
    transit,
    nightlife: log(bars, 1.3),
    food: log(food, 1.15),
    nature: autoStep(parks, [[0, 2], [1, 5], [3, 7]], 8),
    quiet: Math.min(9, Math.max(1, Math.round((10 - Math.log2(1 + bars + food / 3) * 1.1) * 10) / 10)),
    budget: log(hostels, 1.2, 3),
    safety: null,
  };
}

export async function autoDistricts(lat: number, lon: number, radius = 3500, max = 14): Promise<AutoDistrict[]> {
  return (await autoCity(lat, lon, radius, max)).districts;
}

// Läuft dieselbe Berechnung schon (z. B. weil die Seite neu geladen wurde), hängen wir uns dran,
// statt die Kartenserver ein zweites Mal zu belasten.
const inflight = new Map<string, Promise<unknown>>();
function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Viertel + Raster einer Stadt, 30 Tage gespeichert: ab dem zweiten Besuch sofort da. */
const autoCityStored = unstable_cache(
  async (lat: number, lon: number, radius: number) => autoCity(lat, lon, radius),
  ["auto-city-v2"],
  { revalidate: 30 * 86400 }, // Viertel ändern sich selten; danach wird im Hintergrund neu berechnet
);
export const autoCityCached = async (lat: number, lon: number, radius = 3500): Promise<AutoCity> => {
  // Vorberechnet (GitHub, aus OpenStreetMap-Dateien)? Dann sofort und ohne Kartenserver.
  const pre = await precomputedCity(lat, lon, radius);
  if (pre) return pre.city;
  return once(`city:${lat},${lon},${radius}`, () => autoCityStored(lat, lon, radius));
};
export const autoDistrictsCached = (lat: number, lon: number) => autoCityCached(lat, lon).then((c) => c.districts);

/**
 * Passende Zonen für die Karte. Wartet nur kurz: ist die Stadt noch nicht berechnet,
 * rechnet sie im Hintergrund weiter und die Karte zeigt beim nächsten Besuch die Zonen.
 */
export async function cityZones(lat: number, lon: number, radius: number, weights: Weights, waitMs = 1200): Promise<ZonePoint[]> {
  const r = await cityDataQuick(lat, lon, radius, waitMs);
  return r ? pickZones(r.zones, weights) : [];
}

/** Raster, Viertel und Namen einer Stadt – nur kurz warten, sonst im Hintergrund weiterrechnen (null). */
export async function cityDataQuick(lat: number, lon: number, radius: number, waitMs = 1200): Promise<AutoCity | null> {
  const work = autoCityCached(Number(lat.toFixed(4)), Number(lon.toFixed(4)), radius).catch(() => null);
  const r = await withDeadline(work, waitMs);
  if (r === "slow") {
    after(() => work);
    return null;
  }
  return r;
}

/** Unterkünfte mit Lage-Score: Rohdaten 14 Tage gespeichert (je Ort und Radius), sortiert wird je Profil. */
const hotelsScoredStored = unstable_cache(
  async (center: { lat: number; lon: number }, district: District | null, radius: number, areaName: string) =>
    hotelsScored(center, district, radius, areaName),
  ["hotels-v3"],
  { revalidate: 14 * 86400 },
);
export const hotelsNearCached = async (
  center: { lat: number; lon: number },
  district: District | null,
  weights: Weights,
  radius: number,
  areaName: string,
) => {
  const pre = await precomputedCovering(center.lat, center.lon);
  if (pre) {
    const list: HotelResult[] = pre.hotels
      .filter((h) => distance(center.lat, center.lon, h.lat, h.lon) <= radius)
      .map((h) => {
        // In geprüften Städten kommt die Sicherheit aus unserer Viertel-Bewertung
        const scores = { ...h.scores, ...(district?.scores?.safety != null ? { safety: district.scores.safety } : {}) } as LocationScores;
        return { ...h, subtitle: h.subtitle || areaName, scores, match: 0 };
      });
    return rankHotels(list, weights);
  }
  return rankHotels(
    await once(`hotels:${center.lat},${center.lon},${radius}`, () => hotelsScoredStored(center, district, radius, areaName)),
    weights,
  );
};

/** Wartet höchstens ms Millisekunden. Danach „slow“ – die Arbeit läuft weiter und landet im Zwischenspeicher. */
export async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T | "slow"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"slow">((r) => (timer = setTimeout(() => r("slow"), ms)));
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Kurzer Gesundheitscheck der Kartenserver (Antwortzeit einer winzigen Abfrage). */
export async function overpassPing() {
  const q = encodeURIComponent('[out:json][timeout:10];node(52.52,13.40,52.521,13.401);out skel 1;');
  return Promise.all(
    [
      ...OVERPASS_FAST,
      OVERPASS_FALLBACK,
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      "https://overpass.osm.jp/api/interpreter",
      "https://overpass.openstreetmap.ru/api/interpreter",
    ].map(async (e) => {
      const t = Date.now();
      try {
        const r = await fetch(`${e}?data=${q}`, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
        return { server: new URL(e).host, status: r.status, ms: Date.now() - t };
      } catch (err) {
        return { server: new URL(e).host, status: String((err as Error).message).slice(0, 60), ms: Date.now() - t };
      }
    }),
  );
}
