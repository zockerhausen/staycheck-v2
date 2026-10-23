// Lage-Analyse mit kostenlosen OpenStreetMap-Daten.
// - Suche/Geocoding: Photon (photon.komoot.io), erlaubt Suche beim Tippen
// - Umgebung (Bars, Bahn, Parks, Hotels …): Overpass API
// Funktioniert weltweit. Sicherheit kommt aus unseren Kiez-Bewertungen (nur dort, wo wir sie haben).

import type { District, Weights } from "./data";

const UA = "StayCheck/0.1 (https://github.com/zockerhausen/staycheck-v2)";
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

export type Place = {
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  kind: "hotel" | "hostel" | "guest_house" | "apartment" | "address" | "other";
};

export type Poi = { lat: number; lon: number; tags: Record<string, string> };

export type LocationScores = Record<string, number | null>; // null = keine Daten

export type Highlight = { icon: "transit" | "nightlife" | "food" | "nature" | "walk" | "hotel"; text: string };

export type LocationAnalysis = {
  scores: LocationScores;
  highlights: Highlight[];
  district: District | null;
  counts: { bars: number; food: number; hostels: number };
};

// ---------- Hilfsfunktionen ----------

export function distance(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const walkMin = (m: number) => Math.max(1, Math.round(m / 80));
const clamp = (n: number) => Math.min(10, Math.max(1, Math.round(n)));
const step = (value: number, table: [number, number][], fallback: number) => {
  for (const [limit, score] of table) if (value <= limit) return score;
  return fallback;
};

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

async function overpass(query: string): Promise<Poi[]> {
  let lastError: unknown;
  for (const endpoint of OVERPASS) {
    try {
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": UA },
        next: { revalidate: 86400 }, // 1 Tag zwischenspeichern
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as {
        elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
      };
      return json.elements
        .map((e) => ({ lat: e.lat ?? e.center?.lat ?? NaN, lon: e.lon ?? e.center?.lon ?? NaN, tags: e.tags ?? {} }))
        .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon));
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overpass nicht erreichbar");
}

function poiQuery(lat: number, lon: number, extra = 0) {
  const a = (r: number) => `around:${r + extra},${lat.toFixed(5)},${lon.toFixed(5)}`;
  return `[out:json][timeout:25];
(
  nwr(${a(600)})[amenity~"^(bar|pub|nightclub|biergarten)$"];
  nwr(${a(500)})[amenity~"^(restaurant|cafe|fast_food|food_court)$"];
  node(${a(900)})[railway~"^(station|halt|tram_stop)$"];
  node(${a(900)})[public_transport=station];
  node(${a(400)})[highway=bus_stop];
  nwr(${a(800)})[leisure~"^(park|garden|nature_reserve)$"];
  nwr(${a(800)})[natural=water];
  way(${a(120)})[highway~"^(motorway|trunk|primary)$"];
  nwr(${a(800)})[tourism~"^(hostel|guest_house)$"];
);
out center tags;`;
}

const isBar = (t: Record<string, string>) => /^(bar|pub|nightclub|biergarten)$/.test(t.amenity ?? "");
const isFood = (t: Record<string, string>) => /^(restaurant|cafe|fast_food|food_court)$/.test(t.amenity ?? "");
const isRail = (t: Record<string, string>) =>
  /^(station|halt|tram_stop)$/.test(t.railway ?? "") || t.public_transport === "station";
const isBus = (t: Record<string, string>) => t.highway === "bus_stop";
const isGreen = (t: Record<string, string>) =>
  /^(park|garden|nature_reserve)$/.test(t.leisure ?? "") || t.natural === "water";
const isMainRoad = (t: Record<string, string>) => /^(motorway|trunk|primary)$/.test(t.highway ?? "");
const isBudgetStay = (t: Record<string, string>) => /^(hostel|guest_house)$/.test(t.tourism ?? "");

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

/** Bewertet einen Punkt anhand der POIs in seiner Umgebung (Werte 1–10). */
export function scoreLocation(lat: number, lon: number, pois: Poi[], district: District | null): LocationAnalysis {
  const within = (r: number, test: (t: Record<string, string>) => boolean) =>
    pois.filter((p) => test(p.tags) && distance(lat, lon, p.lat, p.lon) <= r);
  const nearest = (test: (t: Record<string, string>) => boolean, max: number) => {
    let best: Poi | null = null;
    let bestDist = Infinity;
    for (const p of pois) {
      if (!test(p.tags)) continue;
      const d = distance(lat, lon, p.lat, p.lon);
      if (d < bestDist && d <= max) {
        best = p;
        bestDist = d;
      }
    }
    return best ? { poi: best, dist: bestDist } : null;
  };

  const bars = within(600, isBar).length;
  const barsClose = within(250, isBar).length;
  const food = within(500, isFood).length;
  const hostels = within(800, isBudgetStay).length;
  const rail = nearest(isRail, 900);
  const bus = within(400, isBus).length;
  const green = nearest(isGreen, 800);
  const mainRoad = within(120, isMainRoad).length > 0;

  const transit = rail
    ? step(rail.dist, [[250, 10], [400, 9], [550, 8], [700, 6], [900, 5]], 5)
    : bus > 0 ? 3 : 1;
  const nightlife = step(bars, [[0, 1], [2, 3], [5, 5], [10, 7], [20, 9]], 10);
  const foodScore = step(food, [[0, 1], [3, 3], [8, 5], [15, 7], [30, 9]], 10);
  const nature = green ? step(green.dist, [[200, 10], [400, 8], [600, 6]], 4) : 2;
  const quiet = clamp(10 - barsClose * 0.7 - (mainRoad ? 3 : 0) - Math.max(0, food - 15) * 0.1);
  const hostelScore = step(hostels, [[0, 4], [2, 6], [5, 8]], 9);
  const budget = district ? clamp((district.scores.budget * 2 + hostelScore) / 3) : hostelScore;
  const safety = district ? district.scores.safety ?? null : null;

  const highlights: Highlight[] = [];
  if (rail) {
    const n = rail.poi.tags.name ?? "Bahnhof";
    highlights.push({ icon: "transit", text: `${walkMin(rail.dist)} Min. zu Fuß bis ${n}` });
  } else highlights.push({ icon: "transit", text: bus > 0 ? "Nur Bus in der Nähe, keine Bahn" : "Keine Bahn in Laufweite" });
  highlights.push({ icon: "nightlife", text: bars === 0 ? "Keine Bars in der Nähe" : `${bars} Bars und Clubs im Umkreis von 600 m` });
  highlights.push({ icon: "food", text: `${food} Restaurants und Cafés in 500 m` });
  if (green) highlights.push({ icon: "nature", text: `${walkMin(green.dist)} Min. bis ${green.poi.tags.name ?? "ins Grüne"}` });
  if (mainRoad) highlights.push({ icon: "walk", text: "Liegt an einer großen Straße, kann laut sein" });

  return {
    scores: { budget, nightlife, quiet, safety, transit, food: foodScore, nature },
    highlights,
    district,
    counts: { bars, food, hostels },
  };
}

export async function analyzeLocation(lat: number, lon: number, districts: District[]) {
  const pois = await overpass(poiQuery(lat, lon));
  return scoreLocation(lat, lon, pois, nearestDistrict(lat, lon, districts));
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
out center tags;`;
  const [hotels, pois] = await Promise.all([overpass(hotelsQuery), overpass(poiQuery(center.lat, center.lon, radius))]);

  return hotels
    .map((h) => {
      const a = scoreLocation(h.lat, h.lon, pois, district);
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
