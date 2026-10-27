// Website-Wissen: Datenformat von data/insights/<stadt>.json (erzeugt von scripts/insights/research.ts).
export const INSIGHT_KEYS = ["transit", "nightlife", "food", "nature", "quiet", "budget", "safety"] as const;
export type InsightKey = (typeof INSIGHT_KEYS)[number];

export type InsightSource = { url: string; title: string };
export type InsightValue = { v: number; why: string; src: number[] }; // src = Nummern in sources
export type AreaInsight = {
  name: string;
  kind: "ecke" | "viertel";
  lat: number;
  lon: number;
  checked: string;
  found: boolean;
  summary: string;
  goodFor: string[];
  watchOut: string[];
  values: Partial<Record<InsightKey, InsightValue>>;
  sources: InsightSource[];
};
export type CityInsights = { v: 1; slug: string; generated: string; model: string; areas: AreaInsight[] };

/** Was Reiseseiten zu einem Wert sagen (hängt an Detail.web, für die Anzeige) */
export type WebPart = { score: number; measured: number | null; why: string; area: string; sources: InsightSource[] };
