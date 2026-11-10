// Reisetypen: ein Tipp setzt das ganze Reise-Profil (Gewichte 0 = egal … 5 = unverzichtbar).
// Danach kann jede:r auf der Karte nachjustieren. Läuft im Browser und auf dem Server.
import type { IconName } from "@/lib/icons";
import type { ExtraKey, PriceBand, Weights } from "@/lib/profile";

export type TravelType = {
  key: string;
  name: string;
  sub: string;
  icon: IconName;
  weights: Weights;
  /** Was in Laufweite mitzählt (Extras) */
  items?: ExtraKey[];
};

export const TRAVEL_TYPES: TravelType[] = [
  {
    key: "nachteule",
    name: "Nachteule",
    sub: "Bars und Clubs vor der Tür",
    icon: "nightlife",
    weights: { nightlife: 5, food: 3, transit: 3, budget: 3, quiet: 1, safety: 3, nature: 1 },
  },
  {
    key: "foodie",
    name: "Foodie",
    sub: "Märkte, Streetfood, Restaurants",
    icon: "food",
    weights: { food: 5, nightlife: 3, transit: 3, budget: 3, quiet: 2, safety: 3, nature: 2 },
  },
  {
    key: "ruhe",
    name: "Ruhesucher:in",
    sub: "Gut schlafen, viel Grün",
    icon: "quiet",
    weights: { quiet: 5, nature: 4, safety: 4, food: 3, transit: 3, budget: 3, nightlife: 0 },
  },
  {
    key: "sparfuchs",
    name: "Sparfuchs",
    sub: "Wenig zahlen, gut angebunden",
    icon: "budget",
    weights: { budget: 5, transit: 4, food: 3, nightlife: 3, safety: 3, quiet: 2, nature: 2 },
  },
  {
    key: "entdecker",
    name: "Entdecker:in",
    sub: "Schnell überall hin",
    icon: "transit",
    weights: { transit: 5, food: 4, budget: 3, safety: 3, nature: 3, nightlife: 2, quiet: 2 },
  },
  {
    key: "nomad",
    name: "Digital Nomad",
    sub: "Cafés, Ruhe, länger bleiben",
    icon: "cup",
    weights: { quiet: 4, food: 4, budget: 4, transit: 3, safety: 3, nightlife: 2, nature: 2 },
    items: ["cafe", "supermarkt"],
  },
];

/** Die Regler auf der Karte: genau die Dinge, die wir für jede Ecke messen */
export const TUNE_KEYS = ["nightlife", "quiet", "food", "transit", "budget", "nature"] as const;
export const TUNE_LABEL: Record<string, string> = {
  nightlife: "Nachtleben",
  quiet: "Ruhe",
  food: "Essen",
  transit: "Bahn",
  budget: "Günstig",
  nature: "Grün",
  safety: "Sicherheit",
};
/** Schnell-Knöpfe: einmal tippen = eine Stufe wichtiger */
export const TUNE_MORE: Record<string, string> = {
  nightlife: "Mehr Nachtleben",
  quiet: "Ruhiger",
  budget: "Günstiger",
  food: "Besseres Essen",
  transit: "Näher an der Bahn",
  nature: "Mehr Grün",
};
export const LEVELS = ["egal", "kaum", "etwas", "wichtig", "sehr wichtig", "unverzichtbar"];

/** Die 2 bis 3 Dinge, die bei diesem Profil am meisten zählen (für die Erklärung auf der Karte) */
export function topOf(weights: Weights, n = 3): string[] {
  return Object.entries(weights)
    .filter(([k, v]) => v >= 4 && TUNE_LABEL[k])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => TUNE_LABEL[k]);
}

/** Budget pro Nacht wirkt auch auf die Lage: knappes Budget → günstige Gegenden zählen mehr, und umgekehrt */
export function withBudget(weights: Weights, preis: PriceBand | null): Weights {
  if (preis === 1) return { ...weights, budget: Math.max(weights.budget ?? 0, 4) };
  if (preis === 3) return { ...weights, budget: Math.min(weights.budget ?? 0, 2) };
  return weights;
}
