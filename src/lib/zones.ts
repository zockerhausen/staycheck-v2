// Zonen auf der Karte: feines Raster (ca. 350 m) mit Werten aus Kartendaten.
// Läuft im Browser und auf dem Server.
import { weightedMatch, type Weights } from "@/lib/profile";

export const ZONE_KEYS = ["transit", "nightlife", "food", "nature", "quiet", "budget"] as const;

export type ZonePoint = { lat: number; lon: number; w: number }; // w: 0–1, wie gut es passt

/**
 * Nur die Stellen, die wirklich gut passen: die besten ~25 % der Stadt und mindestens 55 % Match.
 * So leuchtet nie die ganze Stadt, sondern nur die passenden Ecken.
 */
export function pickZones(zones: { lat: number; lon: number; s: number[] }[], weights: Weights, share = 0.25): ZonePoint[] {
  if (!zones.length) return [];
  const scored = zones.map((z) => {
    const scores = Object.fromEntries(ZONE_KEYS.map((k, i) => [k, z.s[i]]));
    return { lat: z.lat, lon: z.lon, m: weightedMatch(scores, weights) };
  });
  const sorted = [...scored].map((z) => z.m).sort((a, b) => b - a);
  const cut = Math.max(55, sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))]);
  const top = sorted[0];
  return scored
    .filter((z) => z.m >= cut)
    .map((z) => ({ lat: z.lat, lon: z.lon, w: top > cut ? Math.round(((z.m - cut) / (top - cut)) * 0.6 * 100 + 40) / 100 : 1 }));
}

// ---------- Ecken: kleine Gegenden, die wirklich passen ----------

export type Spot = {
  slug: string;
  name: string; // z. B. „Wrangelkiez“
  area: string; // größerer Stadtteil zur Orientierung, z. B. „Kreuzberg“
  lat: number;
  lon: number;
  match: number;
  scores: Record<string, number>;
  cells: number; // Größe in Rasterpunkten (je ca. 350 × 350 m)
};

type NamedPlace = { n: string; lat: number; lon: number; l: number };

const dist = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const dLat = (a.lat - b.lat) * 110540;
  const dLon = (a.lon - b.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
};
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "ecke";

/**
 * Findet die Ecken einer Stadt, die am besten zum Profil passen:
 * die besten Rasterpunkte, zusammenhängende zu einer Ecke verbunden, jede nach dem nächsten Kiez benannt.
 */
export function findSpots(
  zones: { lat: number; lon: number; s: number[] }[],
  weights: Weights,
  places: NamedPlace[] = [],
  step = 350,
  max = 8,
): Spot[] {
  if (zones.length < 4) return [];
  const cells = zones.map((z) => {
    const scores = Object.fromEntries(ZONE_KEYS.map((k, i) => [k, z.s[i]])) as Record<string, number>;
    return { lat: z.lat, lon: z.lon, scores, m: weightedMatch(scores, weights) };
  });
  const sorted = cells.map((c) => c.m).sort((a, b) => b - a);
  const cut = Math.max(58, sorted[Math.floor(sorted.length * 0.15)] ?? 0);
  const good = cells.filter((c) => c.m >= cut);

  // Zusammenhängende gute Punkte (Nachbarn im Raster) zu Ecken verbinden
  const seen = new Set<number>();
  const groups: (typeof good)[] = [];
  for (let i = 0; i < good.length; i++) {
    if (seen.has(i)) continue;
    const queue = [i];
    seen.add(i);
    const group = [];
    while (queue.length) {
      const j = queue.pop()!;
      group.push(good[j]);
      for (let k = 0; k < good.length; k++) {
        if (!seen.has(k) && dist(good[j], good[k]) <= step * 1.5) {
          seen.add(k);
          queue.push(k);
        }
      }
    }
    groups.push(group);
  }

  // Große Gebiete aufteilen: eine Ecke soll zu Fuß überschaubar sein (höchstens ~1 km um ihre Mitte)
  const pieces: (typeof good)[] = [];
  for (const g of groups) {
    let rest = [...g].sort((a, b) => b.m - a.m);
    while (rest.length) {
      const seed = rest[0];
      const piece = rest.filter((c) => dist(c, seed) <= 900);
      pieces.push(piece);
      rest = rest.filter((c) => !piece.includes(c));
    }
  }

  const finer = places.filter((p) => p.l >= 1);
  const coarse = places.filter((p) => p.l === 0);
  const nearest = (list: NamedPlace[], p: { lat: number; lon: number }, within: number) => {
    let best: NamedPlace | null = null;
    let bd = within;
    for (const x of list) {
      const d = dist(p, x);
      if (d < bd) {
        bd = d;
        best = x;
      }
    }
    return best;
  };

  const spots: Spot[] = [];
  // Große Stücke zuerst benennen, kleine Reste daneben werden dann nicht als eigene Ecke gezeigt
  pieces.sort((a, b) => b.length - a.length);
  for (const piece of pieces) {
    if (piece.length < 2 && piece[0].m < cut + 8) continue; // einzelne Punkte nur, wenn sie herausragen
    const wsum = piece.reduce((s, c) => s + c.m, 0);
    const lat = piece.reduce((s, c) => s + c.lat * c.m, 0) / wsum;
    const lon = piece.reduce((s, c) => s + c.lon * c.m, 0) / wsum;
    const center = { lat, lon };
    const scores = Object.fromEntries(
      ZONE_KEYS.map((k) => [k, Math.round((piece.reduce((s, c) => s + c.scores[k], 0) / piece.length) * 10) / 10]),
    ) as Record<string, number>;
    const fine = nearest(finer, center, 700) ?? nearest(places, center, 700);
    const big = nearest(coarse, center, 2500);
    // Kein Kiez direkt hier: gehört das Stück zu einer schon gefundenen Ecke in der Nähe, nicht doppelt zeigen
    if (!fine && spots.some((s) => dist(s, center) < 1500)) continue;
    const name = fine?.n ?? (big ? `Rund um ${big.n}` : "Gute Ecke");
    if (spots.some((s) => s.name === name)) continue; // gleicher Name = gleiche Gegend
    spots.push({
      slug: slugify(name),
      name,
      area: big && big.n !== name && !name.startsWith("Rund um") ? big.n : "",
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      match: Math.round(piece.reduce((s, c) => s + c.m, 0) / piece.length),
      scores,
      cells: piece.length,
    });
  }
  return spots.sort((a, b) => b.match - a.match || b.cells - a.cells).slice(0, max);
}
