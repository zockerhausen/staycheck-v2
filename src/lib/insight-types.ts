// Website-Wissen: Datenformat von data/insights/<stadt>.json (erzeugt von scripts/insights/research.ts).
export const INSIGHT_KEYS = ["transit", "nightlife", "food", "nature", "quiet", "budget", "safety"] as const;
export type InsightKey = (typeof INSIGHT_KEYS)[number];

export type InsightSource = { url: string; title: string };
/** v = Wert 1–10, src = Nummern in sources, w = Verlässlichkeit 0–1 (fehlt = 1): bestimmt, wie stark der Wert zählt */
export type InsightValue = { v: number; why: string; src: number[]; w?: number };
export type AreaInsight = {
  name: string;
  /** raster = Reiseführer-Werte an einem Rasterpunkt (Wikivoyage), ecke/viertel = Text-Auswertung einer Gegend */
  kind: "ecke" | "viertel" | "raster";
  lat: number;
  lon: number;
  checked?: string;
  found: boolean;
  summary?: string;
  goodFor?: string[];
  watchOut?: string[];
  values: Partial<Record<InsightKey, InsightValue>>;
  sources: InsightSource[];
};
export type CityInsights = { v: 1; slug: string; generated: string; model: string; areas: AreaInsight[] };

/** Was der Reiseführer zu einem Wert sagt (hängt an Detail.web, für die Anzeige); share = Anteil am Wert (0–0,5) */
export type WebPart = { score: number; measured: number | null; why: string; area: string; sources: InsightSource[]; share?: number };
