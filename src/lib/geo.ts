// Lage-Analyse mit kostenlosen OpenStreetMap-Daten.
// - Suche/Geocoding: Photon (photon.komoot.io), erlaubt Suche beim Tippen
// - Umgebung (Bars, Bahn, Parks, Hotels …): Overpass API
// Funktioniert weltweit. Sicherheit kommt aus unseren Kiez-Bewertungen (nur dort, wo wir sie haben).

import type { District, Weights } from "./data";
import { distance, scoreFromData, type Highlight, type Line, type Poi, type ScoreResult } from "./score";

const UA = "StayCheck/0.1 (https://github.com/zockerhausen/staycheck-v2)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

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

type OverpassElement = {
  type: string;
  lat?: number;
  lon?: number;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  members?: { role?: string; geometry?: { lat: number; lon: number }[] }[];
  tags?: Record<string, string>;
};

async function overpass(query: string): Promise<OverpassElement[]> {
  let lastError: unknown;
  for (const endpoint of OVERPASS) {
    try {
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": UA },
        next: { revalidate: 86400 }, // 1 Tag zwischenspeichern
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements: OverpassElement[] };
      return json.elements ?? [];
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overpass nicht erreichbar");
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
function split(elements: OverpassElement[]): { pois: Poi[]; lines: Line[] } {
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
  nwr(${a(500)})[shop];
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

export async function analyzeLocation(lat: number, lon: number, districts: District[]) {
  const data = split(await overpass(poiQuery(lat, lon)));
  return scoreLocation(lat, lon, data, nearestDistrict(lat, lon, districts));
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

export async function hotelsNear(
  center: { lat: number; lon: number },
  district: District,
  weights: Weights,
  radius = 1400,
): Promise<HotelResult[]> {
  const c = `${center.lat.toFixed(5)},${center.lon.toFixed(5)}`;
  const hotelsQuery = `[out:json][timeout:25];
nwr(around:${radius},${c})[tourism~"^(hotel|hostel|guest_house|apartment)$"][name];
out tags center;`;
  const [hotelEls, raw] = await Promise.all([overpass(hotelsQuery), overpass(poiQuery(center.lat, center.lon, radius))]);
  const data = split(raw);
  const hotels = split(hotelEls).pois;

  return hotels
    .map((h) => {
      const a = scoreLocation(h.lat, h.lon, data, district);
      const street = [h.tags["addr:street"], h.tags["addr:housenumber"]].filter(Boolean).join(" ");
      return {
        name: h.tags.name,
        subtitle: street || district.name,
        lat: h.lat,
        lon: h.lon,
        kind: kindOf(h.tags),
        scores: a.scores,
        match: locationMatch(a.scores, weights),
        highlights: a.highlights.slice(0, 2),
      };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 40);
}
