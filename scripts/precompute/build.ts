// Vorberechnung einer Stadt aus heruntergeladenen OpenStreetMap-Daten (osmium export → geojsonseq).
// Nutzt exakt dieselben Rechenwege wie die App (autoCityFromData, hotelsFromData), nur ohne Overpass-Server.
// Aufruf: node build.mjs <stadt.json> <features.geojsonseq> <airports.csv (OurAirports)> <ausgabe.json>
import { readFileSync, writeFileSync } from "node:fs";
import { autoCityFromData, hotelsFromData, split, type OverpassElement } from "../../src/lib/geo";
import { distance, type Line, type Poi } from "../../src/lib/score";

type City = { slug: string; ort: string; land: string; lat: number; lon: number; radius: number };
type Geo = { type: string; coordinates: unknown };
type Feature = { id?: string; geometry: Geo; properties: Record<string, string> };

const [cityArg, featuresPath, airportsPath, outPath] = process.argv.slice(2);
const city: City = JSON.parse(cityArg);

function readSeq(path: string): Feature[] {
  const out: Feature[] = [];
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.replace(/^\x1e/, "").trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // kaputte Zeile überspringen
    }
  }
  return out;
}

const ring = (coords: number[][]) => coords.map(([lon, lat]) => ({ lat, lon }));
const centerOf = (pts: { lat: number; lon: number }[]) => {
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lon: (Math.min(...lons) + Math.max(...lons)) / 2 };
};

/** GeoJSON-Feature → dieselbe Form wie eine Overpass-Antwort (Punkt, Linie, Fläche, Mehrfach-Fläche). */
function toElement(f: Feature): (OverpassElement & { c: { lat: number; lon: number } }) | null {
  const tags = f.properties ?? {};
  const g = f.geometry;
  if (!g) return null;
  if (g.type === "Point") {
    const [lon, lat] = g.coordinates as number[];
    return { type: "node", lat, lon, tags, c: { lat, lon } };
  }
  if (g.type === "LineString") {
    const geometry = ring(g.coordinates as number[][]);
    return { type: "way", geometry, tags, c: centerOf(geometry) };
  }
  if (g.type === "Polygon") {
    const geometry = ring((g.coordinates as number[][][])[0]);
    return { type: "way", geometry, tags, c: centerOf(geometry) };
  }
  if (g.type === "MultiPolygon") {
    const outers = (g.coordinates as number[][][][]).map((poly) => ring(poly[0]));
    const all = outers.flat();
    const lats = all.map((p) => p.lat);
    const lons = all.map((p) => p.lon);
    const bounds = { minlat: Math.min(...lats), minlon: Math.min(...lons), maxlat: Math.max(...lats), maxlon: Math.max(...lons) };
    return {
      type: "relation",
      members: outers.map((geometry) => ({ role: "outer", geometry })),
      bounds,
      tags,
      c: { lat: (bounds.minlat + bounds.maxlat) / 2, lon: (bounds.minlon + bounds.maxlon) / 2 },
    };
  }
  return null;
}

const t0 = Date.now();
const els = readSeq(featuresPath).map(toElement).filter((e): e is NonNullable<ReturnType<typeof toElement>> => e !== null);
const within = (e: { c: { lat: number; lon: number } }, r: number) => distance(city.lat, city.lon, e.c.lat, e.c.lon) <= r;

// ---------- Viertel, Raster und Namen (wie autoCity) ----------
const PLACE = /^(suburb|quarter|neighbourhood)$/;
const places = els.filter((e) => e.type === "node" && PLACE.test(e.tags?.place ?? "") && e.tags?.name && within(e, city.radius));
const t = (e: OverpassElement, k: string) => e.tags?.[k] ?? "";
const CATS: ((e: OverpassElement) => boolean)[] = [
  (e) => /^(bar|pub|nightclub|biergarten)$/.test(t(e, "amenity")) && e.type !== "relation",
  (e) => /^(restaurant|cafe|fast_food|food_court)$/.test(t(e, "amenity")) && e.type !== "relation",
  (e) => e.type === "node" && /^(station|halt)$/.test(t(e, "railway")),
  (e) => e.type === "node" && t(e, "railway") === "tram_stop",
  (e) => e.type === "node" && t(e, "highway") === "bus_stop",
  (e) => e.type === "way" && t(e, "leisure") === "park" && (e.geometry?.length ?? 0) > 2,
  (e) => /^(hostel|guest_house)$/.test(t(e, "tourism")) && e.type !== "relation",
];
const groups = CATS.map((test) => els.filter(test).map((e) => ({ lat: e.c.lat, lon: e.c.lon })));
const auto = autoCityFromData(city.lat, city.lon, city.radius, 14, places, groups);

// ---------- Alle Unterkünfte mit Lage-Werten ----------
// Kartendaten für die Bewertung; je Unterkunft nur die Umgebung (schnell), große Flächen immer dazu
const data = split(els);
const CELL = 0.01;
const bucketKey = (lat: number, lon: number) => `${Math.floor(lat / CELL)}:${Math.floor(lon / CELL)}`;
const poiBuckets = new Map<string, Poi[]>();
const bigAreas: Poi[] = [];
for (const p of data.pois) {
  if (p.bbox && (p.area ?? 0) > 50_000) bigAreas.push(p);
  const k = bucketKey(p.lat, p.lon);
  (poiBuckets.get(k) ?? poiBuckets.set(k, []).get(k)!).push(p);
}
const lineBuckets = new Map<string, Line[]>();
for (const l of data.lines) {
  const keys = new Set(l.points.map((p) => bucketKey(p.lat, p.lon)));
  for (const k of keys) (lineBuckets.get(k) ?? lineBuckets.set(k, []).get(k)!).push(l);
}
const around = (lat: number, lon: number) => {
  const bi = Math.floor(lat / CELL);
  const bj = Math.floor(lon / CELL);
  const pois = new Set<Poi>(bigAreas);
  const lines = new Set<Line>();
  for (let i = bi - 1; i <= bi + 1; i++)
    for (let j = bj - 2; j <= bj + 2; j++) {
      for (const p of poiBuckets.get(`${i}:${j}`) ?? []) pois.add(p);
      for (const l of lineBuckets.get(`${i}:${j}`) ?? []) lines.add(l);
    }
  return { pois: [...pois], lines: [...lines] };
};

const STAY = /^(hotel|hostel|guest_house|apartment)$/;
const stays = data.pois.filter((p) => STAY.test(p.tags.tourism ?? "") && p.tags.name && distance(city.lat, city.lon, p.lat, p.lon) <= city.radius + 300);
const hotels = stays.flatMap((h) => hotelsFromData([h], around(h.lat, h.lon), null, "", 1));
const scoreKeys = [...new Set(hotels.flatMap((h) => Object.keys(h.scores)))];

// ---------- Ehrliche Zusatzdaten ----------
// Sehenswürdigkeiten mit Namen (für „In 15 Minuten zu Fuß“)
const SIGHT = (p: Poi) =>
  /^(attraction|museum|viewpoint|gallery|zoo)$/.test(p.tags.tourism ?? "") || /^(monument|castle|ruins|city_gate|archaeological_site)$/.test(p.tags.historic ?? "");
const sights = data.pois
  .filter((p) => SIGHT(p) && p.tags.name && distance(city.lat, city.lon, p.lat, p.lon) <= city.radius + 1500)
  .map((p) => ({
    n: (p.tags["name:de"] ?? p.tags["name:en"] ?? p.tags.name).slice(0, 70),
    lat: Math.round(p.lat * 1e5) / 1e5,
    lon: Math.round(p.lon * 1e5) / 1e5,
    k: p.tags.tourism ?? p.tags.historic ?? "",
    // Wie bekannt? Wikipedia-Artikel, Wikidata, echte Attraktion/Aussicht/Museum und viele Angaben in der Karte
    w:
      (p.tags.wikipedia ? 3 : 0) +
      (p.tags.wikidata ? 1 : 0) +
      (/^(attraction|viewpoint|museum|zoo)$/.test(p.tags.tourism ?? "") ? 2 : 0) +
      (/^(castle|city_gate)$/.test(p.tags.historic ?? "") ? 1 : 0) +
      Math.min(3, Math.floor(Object.keys(p.tags).length / 8)),
  }))
  .filter((s) => /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]+$/u.test(s.n))
  .sort((a, b) => b.w - a.w)
  .slice(0, 300);

// Flughafen: aus der freien OurAirports-Liste (größere Flughäfen mit Linienflügen), die nächsten im Umkreis von 80 km
function csvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
const csv = readFileSync(airportsPath, "utf8").split("\n");
const head = csvRow(csv[0]);
const col = (n: string) => head.indexOf(n);
const airports = csv
  .slice(1)
  .map(csvRow)
  .filter((r) => /^(large_airport|medium_airport)$/.test(r[col("type")] ?? "") && r[col("iata_code")] && r[col("scheduled_service")] === "yes")
  .map((r) => {
    const la = Number(r[col("latitude_deg")]);
    const lo = Number(r[col("longitude_deg")]);
    return {
      n: r[col("name")].slice(0, 80),
      iata: r[col("iata_code")],
      lat: Math.round(la * 1e4) / 1e4,
      lon: Math.round(lo * 1e4) / 1e4,
      km: Math.round(distance(city.lat, city.lon, la, lo) / 100) / 10,
      big: r[col("type")] === "large_airport" ? 1 : 0,
    };
  })
  .filter((x) => Number.isFinite(x.km) && x.km <= 80)
  .sort((x, y) => y.big - x.big || x.km - y.km)
  .slice(0, 2)
  .map(({ big: _big, ...x }) => x);

const round = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
const out = {
  v: 1,
  slug: city.slug,
  ort: city.ort,
  land: city.land,
  lat: city.lat,
  lon: city.lon,
  radius: city.radius,
  generated: new Date().toISOString().slice(0, 10),
  city: auto,
  scoreKeys,
  // Kompakt: [Name, Straße, lat, lon, Art, Werte (Reihenfolge scoreKeys), Highlights]
  hotels: hotels.map((h) => [
    h.name.slice(0, 90),
    h.subtitle.slice(0, 90),
    Math.round(h.lat * 1e5) / 1e5,
    Math.round(h.lon * 1e5) / 1e5,
    h.kind,
    scoreKeys.map((k) => round((h.scores as Record<string, number | null>)[k] ?? null)),
    h.highlights,
  ]),
  sights,
  airports,
};
writeFileSync(outPath, JSON.stringify(out));
console.log(
  `${city.slug}: ${auto.districts.length} Viertel, ${auto.zones.length} Rasterpunkte, ${hotels.length} Unterkünfte, ${sights.length} Sehenswürdigkeiten, Flughafen ${airports[0]?.iata ?? "–"} · ${Math.round((Date.now() - t0) / 1000)} s`,
);
