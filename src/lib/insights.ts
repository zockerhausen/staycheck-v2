// Website-Wissen in den Lage-Score einrechnen (nur Server, liest data/insights).
// Regel: Wo Reiseseiten etwas Belastbares sagen (mind. 2 Quellen), zählt ihr Wert zu 50 %, die Messung zu 50 %.
// Gilt für eine Stelle, wenn eine recherchierte Gegend höchstens RADIUS entfernt ist (die nächste zählt).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { distance } from "./score";
import type { AreaInsight, CityInsights, InsightKey, WebPart } from "./insight-types";

export const WEB_WEIGHT = 0.5;
export const RADIUS = 900; // m

const DIR = path.join(process.cwd(), "data", "insights");
const cache = new Map<string, Promise<CityInsights | null>>();

export function loadInsights(slug: string): Promise<CityInsights | null> {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return Promise.resolve(null);
  if (!cache.has(slug)) {
    cache.set(
      slug,
      readFile(path.join(DIR, `${slug}.json`), "utf8")
        .then((t) => {
          const d = JSON.parse(t) as CityInsights;
          return { ...d, areas: (d.areas ?? []).filter((a) => a.found && Object.keys(a.values ?? {}).length > 0) };
        })
        .catch(() => null),
    );
  }
  return cache.get(slug)!;
}

/** Nächste recherchierte Gegend im Umkreis (oder null) */
export function nearestArea(ins: CityInsights | null, lat: number, lon: number, radius = RADIUS): AreaInsight | null {
  if (!ins) return null;
  let best: AreaInsight | null = null;
  let bestD = radius;
  for (const a of ins.areas) {
    const d = distance(lat, lon, a.lat, a.lon);
    if (d <= bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Ein Wert: gemessen und Reiseseiten zusammen. Fehlt die Messung, zählt der Reiseseiten-Wert allein. */
export function blendValue(measured: number | null | undefined, web: number | undefined): number | null {
  if (web === undefined) return measured ?? null;
  if (measured === null || measured === undefined) return round1(web);
  return round1(measured * (1 - WEB_WEIGHT) + web * WEB_WEIGHT);
}

/** Alle Werte einer Stelle mischen; liefert die neuen Werte und was Reiseseiten je Wert beigetragen haben */
export function blendScores(
  scores: Record<string, number | null>,
  area: AreaInsight | null,
): { scores: Record<string, number | null>; web: Partial<Record<InsightKey, WebPart>> } {
  if (!area) return { scores, web: {} };
  const out = { ...scores };
  const web: Partial<Record<InsightKey, WebPart>> = {};
  for (const [k, val] of Object.entries(area.values) as [InsightKey, AreaInsight["values"][InsightKey]][]) {
    if (!val) continue;
    if (!(k in scores) && k !== "safety") continue;
    const measured = scores[k] ?? null;
    out[k] = blendValue(measured, val.v);
    web[k] = { score: val.v, measured, why: val.why, area: area.name, sources: val.src.map((i) => area.sources[i]).filter(Boolean) };
  }
  return { scores: out, web };
}

export function webReason(w: WebPart) {
  const hosts = [...new Set(w.sources.map((s) => s.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]))];
  return `Reiseseiten zu ${w.area}: ${w.score}/10, ${w.why} (${hosts.slice(0, 3).join(", ")})`;
}

/** Recherche zu einer Gegend für die Viertel-Seite: gleicher Name in der Nähe, sonst die nächste im Umkreis */
export async function insightNear(lat: number, lon: number, name: string): Promise<AreaInsight | null> {
  const { precomputedCovering } = await import("./precomputed");
  const pre = await precomputedCovering(lat, lon);
  if (!pre) return null;
  const ins = await loadInsights(pre.slug);
  if (!ins) return null;
  const n = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const byName = ins.areas.find((a) => n(a.name) === n(name.replace(/^Rund um (die |den |das )?/i, "")) && distance(lat, lon, a.lat, a.lon) < 2500);
  return byName ?? nearestArea(ins, lat, lon, 700);
}
