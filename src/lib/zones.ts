// Zonen auf der Karte: feines Raster (ca. 350 m) mit Werten aus Kartendaten.
// Läuft im Browser und auf dem Server.
import { profileMatch, type NoGo, type Weights } from "@/lib/profile";

export const ZONE_KEYS = ["transit", "nightlife", "food", "nature", "quiet", "budget"] as const;

/**
 * Werte des Rasterpunkts an dieser Stelle (nächster Punkt bis 300 m), oder null.
 * Für No-Gos an einer Unterkunft: gleiche Skala wie Karte, Ecken und gute Fläche.
 * Sonst wäre z. B. „Partymeile“ an einer Unterkunft fast überall erfüllt (Messung an der Adresse ist gröber gestuft).
 */
export function areaScoresAt(zones: { lat: number; lon: number; s: number[] }[], lat: number, lon: number): Record<string, number> | null {
  let best: { s: number[] } | null = null;
  let bd = 300;
  const cos = Math.cos((lat * Math.PI) / 180);
  for (const z of zones) {
    const dLat = (z.lat - lat) * 110540;
    const dLon = (z.lon - lon) * 111320 * cos;
    const d = Math.sqrt(dLat * dLat + dLon * dLon);
    if (d < bd) {
      bd = d;
      best = z;
    }
  }
  return best ? (Object.fromEntries(ZONE_KEYS.map((k, i) => [k, best!.s[i]])) as Record<string, number>) : null;
}

export type ZonePoint = { lat: number; lon: number; w: number }; // w: 0–1, wie stark der Spot leuchtet

/** Anteil der Stadt, der ohne Viertel-Spots auf der Karte leuchtet: nur die besten der besten */
export const ZONE_TOP = 0.06;

/**
 * Nur die allerbesten Stellen der Stadt (beste ~6 %, mindestens 55 % Match), Ausreißer geglättet.
 * Wird genutzt, wo es keine Viertel gibt; sonst zeigt die Karte die besten Spots je Viertel (bestSpotsIn).
 */
export function pickZones(zones: { lat: number; lon: number; s: number[] }[], weights: Weights, nogo?: NoGo[]): ZonePoint[] {
  if (!zones.length) return [];
  const scored = zones.map((z) => {
    const scores = Object.fromEntries(ZONE_KEYS.map((k, i) => [k, z.s[i]]));
    return { lat: z.lat, lon: z.lon, m: profileMatch(scores, weights, nogo) };
  });
  const sorted = scored.map((z) => z.m).sort((a, b) => b - a);
  const cut = Math.max(55, sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ZONE_TOP) - 1))]);
  return smoothTiers(scored.filter((z) => z.m >= cut).map((z) => ({ lat: z.lat, lon: z.lon, w: 1 })));
}

/**
 * Einzelne Ausreißer-Kästchen weglassen: ein Kästchen bleibt nur, wenn mindestens einer seiner 8 Nachbarn auch dabei ist.
 */
function smoothTiers(cells: ZonePoint[]): ZonePoint[] {
  if (cells.length < 8) return cells;
  // Rasterabstand aus den Daten (kleinster Abstand in Breitengrad-Richtung)
  const lats = [...new Set(cells.map((c) => c.lat))].sort((a, b) => a - b);
  let dLat = Infinity;
  for (let i = 1; i < lats.length; i++) if (lats[i] - lats[i - 1] > 1e-6) dLat = Math.min(dLat, lats[i] - lats[i - 1]);
  const lons = [...new Set(cells.map((c) => c.lon))].sort((a, b) => a - b);
  let dLon = Infinity;
  for (let i = 1; i < lons.length; i++) if (lons[i] - lons[i - 1] > 1e-6) dLon = Math.min(dLon, lons[i] - lons[i - 1]);
  if (!Number.isFinite(dLat) || !Number.isFinite(dLon)) return cells;
  const key = (i: number, j: number) => `${i}:${j}`;
  const ij = (c: ZonePoint) => [Math.round(c.lat / dLat), Math.round(c.lon / dLon)] as const;
  const grid = new Map(cells.map((c) => [key(...ij(c)), c.w]));
  const out: ZonePoint[] = [];
  for (const c of cells) {
    const [i, j] = ij(c);
    let any = 0;
    let strong = 0;
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        if (!a && !b) continue;
        const w = grid.get(key(i + a, j + b));
        if (w) any++;
        if (w === 1) strong++;
      }
    if (any < 1) continue; // ganz allein stehende Kästchen sind eher Zufall
    void strong;
    out.push(c);
  }
  return out;
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
  core?: { lat: number; lon: number }[]; // die allerbesten Punkte (leuchten auf der Karte)
};

/** Die leuchtenden Stellen für die Karte: nur der Kern der gezeigten Spots */
export function spotGlow(spots: Pick<Spot, "core">[]): ZonePoint[] {
  return spots.flatMap((s) => (s.core ?? []).map((c) => ({ lat: c.lat, lon: c.lon, w: 1 })));
}

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
  nogo?: NoGo[],
): Spot[] {
  if (zones.length < 4) return [];
  const cells = zones.map((z) => {
    const scores = Object.fromEntries(ZONE_KEYS.map((k, i) => [k, z.s[i]])) as Record<string, number>;
    return { lat: z.lat, lon: z.lon, scores, m: profileMatch(scores, weights, nogo) };
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
    // Kein Name in der Nähe: nach dem nächsten bekannten Ort benennen (statt namenlos „Gute Ecke“)
    const around = big ?? nearest(coarse, center, 5000) ?? nearest(places, center, 2500);
    const name = fine?.n ?? (around ? `Rund um ${around.n}` : "Gute Ecke");
    if (spots.some((s) => s.name === name || s.slug === slugify(name))) continue; // gleicher Name = gleiche Gegend
    spots.push({
      slug: slugify(name),
      name,
      area: big && big.n !== name && !name.startsWith("Rund um") ? big.n : "",
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      match: Math.round(piece.reduce((s, c) => s + c.m, 0) / piece.length),
      scores,
      cells: piece.length,
      core: coreOf(piece),
    });
  }
  return spots.sort((a, b) => b.match - a.match || b.cells - a.cells).slice(0, max);
}

/** Kern eines Spots: der beste Punkt und Nachbarn, die fast genauso gut sind (höchstens 4 Punkte weniger) */
function coreOf(piece: { lat: number; lon: number; m: number }[]) {
  const best = piece.reduce((a, b) => (b.m > a.m ? b : a));
  return piece
    .filter((c) => c.m >= best.m - 4 && dist(c, best) <= 600)
    .sort((a, b) => b.m - a.m)
    .slice(0, 6)
    .map((c) => ({ lat: c.lat, lon: c.lon }));
}

// ---------- Bester Spot je Viertel ----------

export type DistrictSpot = { slug: string; name: string; lat: number; lon: number; match: number; core: { lat: number; lon: number }[] };

/**
 * Für jedes Viertel die beste kleine Ecke darin: Rasterpunkte gehören zum nächsten Viertel-Mittelpunkt
 * (höchstens 1,5 km entfernt), der beste Punkt und seine fast gleich guten Nachbarn bilden den Spot.
 * Benannt nach dem nächsten Kiez-Namen aus der Karte; sonst „Beste Ecke“.
 */
export function bestSpotsIn(
  zones: { lat: number; lon: number; s: number[] }[],
  weights: Weights,
  districts: { slug: string; lat: number; lon: number }[],
  places: NamedPlace[] = [],
  step = 350,
  nogo?: NoGo[],
): Map<string, DistrictSpot> {
  const out = new Map<string, DistrictSpot>();
  if (!zones.length || !districts.length) return out;
  const groups = new Map<string, { lat: number; lon: number; m: number }[]>();
  for (const z of zones) {
    let best: string | null = null;
    let bd = 1500;
    for (const d of districts) {
      const dd = dist(z, d);
      if (dd < bd) {
        bd = dd;
        best = d.slug;
      }
    }
    if (!best) continue;
    const m = profileMatch(Object.fromEntries(ZONE_KEYS.map((k, i) => [k, z.s[i]])), weights, nogo);
    (groups.get(best) ?? groups.set(best, []).get(best)!).push({ lat: z.lat, lon: z.lon, m });
  }
  const finer = places.filter((p) => p.l >= 1);
  for (const [slug, cells] of groups) {
    if (cells.length < 3) continue;
    const top = cells.reduce((a, b) => (b.m > a.m ? b : a));
    const core = cells.filter((c) => c.m >= top.m - 4 && dist(c, top) <= step * 1.6);
    const lat = core.reduce((s, c) => s + c.lat, 0) / core.length;
    const lon = core.reduce((s, c) => s + c.lon, 0) / core.length;
    let name = "Beste Ecke";
    let bd = 600;
    for (const p of finer) {
      const d = dist({ lat, lon }, p);
      if (d < bd) {
        bd = d;
        name = p.n;
      }
    }
    out.set(slug, {
      slug,
      name,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      match: Math.round(core.reduce((s, c) => s + c.m, 0) / core.length),
      core: core.map((c) => ({ lat: c.lat, lon: c.lon })),
    });
  }
  return out;
}
