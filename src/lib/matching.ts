import type { District, Weights } from "./data";

export type RankedDistrict = District & { match: number };

/**
 * Match in Prozent: gewichteter Durchschnitt der Bezirks-Scores (1–10).
 * Gewicht 0 = egal, 5 = sehr wichtig.
 */
export function matchScore(district: District, weights: Weights): number {
  let sum = 0;
  let max = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (weight <= 0) continue;
    const score = district.scores[key];
    if (score === undefined) continue;
    sum += weight * score;
    max += weight * 10;
  }
  if (max === 0) return 0;
  return Math.round((sum / max) * 100);
}

export function rankDistricts(districts: District[], weights: Weights): RankedDistrict[] {
  return districts
    .map((d) => ({ ...d, match: matchScore(d, weights) }))
    .sort((a, b) => b.match - a.match);
}

/** Die 2 Kriterien, die für diesen Nutzer am stärksten für den Bezirk sprechen. */
export function topReasons(district: District, weights: Weights, n = 2): string[] {
  return Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([key, w]) => ({ key, value: w * (district.scores[key] ?? 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
    .map((r) => r.key);
}
