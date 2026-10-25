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
