import type { District, Weights } from "./data";
import { profileMatch, type NoGo } from "./profile";

export type RankedDistrict = District & { match: number };

/** Match in Prozent, gleiche Rechnung wie überall in der App (siehe weightedMatch). */
export function matchScore(district: District, weights: Weights, nogo?: NoGo[]): number {
  return profileMatch(district.scores, weights, nogo);
}

export function rankDistricts(districts: District[], weights: Weights, nogo?: NoGo[]): RankedDistrict[] {
  return districts
    .map((d) => ({ ...d, match: matchScore(d, weights, nogo) }))
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
