// Reiseführer-Wissen in den Lage-Score einrechnen (nur Server, liest data/insights).
// Quellen: Wikivoyage-Einträge (<stadt>.guide.json.gz, Rasterpunkte) und Text-Auswertungen (<stadt>.json, Gegenden).
// Regel: Ein Reiseführer-Wert zählt höchstens zur Hälfte (WEB_WEIGHT), abgestuft nach seiner Verlässlichkeit w (0–1):
// Artikel-Qualität, Alter und Zahl der Einträge. Gilt jeweils der nächste passende Wert im Umkreis.
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { distance } from "./score";
import { INSIGHT_KEYS, type AreaInsight, type CityInsights, type InsightKey, type InsightValue, type WebPart } from "./insight-types";

export const WEB_WEIGHT = 0.5;
export const RADIUS = 900; // m, für Gegenden aus der Text-Auswertung
const RASTER_RADIUS = 400; // m, für Rasterpunkte (Abstand ca. 350 m)

const DIR = path.join(process.cwd(), "data", "insights");
type Loaded = CityInsights & { grid: Map<string, AreaInsight[]> };
const cache = new Map<string, Promise<Loaded | null>>();

const CELL = 0.01; // ca. 1 km
const key = (lat: number, lon: number) => `${Math.floor(lat / CELL)}:${Math.floor(lon / CELL)}`;

async function readJson(file: string): Promise<CityInsights | null> {
  try {
    const buf = await readFile(path.join(DIR, file));
    return JSON.parse(file.endsWith(".gz") ? gunzipSync(buf).toString("utf8") : buf.toString("utf8")) as CityInsights;
  } catch {
    return null;
  }
}

export function loadInsights(slug: string): Promise<Loaded | null> {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return Promise.resolve(null);
  if (!cache.has(slug)) {
    cache.set(
      slug,
      Promise.all([readJson(`${slug}.json`), readJson(`${slug}.guide.json.gz`)]).then(([text, guide]) => {
        const areas = [...(text?.areas ?? []), ...(guide?.areas ?? [])].filter((a) => a.found && Object.keys(a.values ?? {}).length > 0);
        if (!areas.length) return null;
        const grid = new Map<string, AreaInsight[]>();
        for (const a of areas) (grid.get(key(a.lat, a.lon)) ?? grid.set(key(a.lat, a.lon), []).get(key(a.lat, a.lon))!).push(a);
        const base = text ?? guide!;
        return { ...base, areas, grid };
      }),
    );
  }
  return cache.get(slug)!;
}

/** Nächste Gegend im Umkreis (ohne Rasterpunkte), z. B. für die Text-Karte auf der Viertel-Seite */
export function nearestArea(ins: Loaded | null, lat: number, lon: number, radius = RADIUS): AreaInsight | null {
  if (!ins) return null;
  let best: AreaInsight | null = null;
  let bestD = radius;
  for (const a of ins.areas) {
    if (a.kind === "raster") continue;
    const d = distance(lat, lon, a.lat, a.lon);
    if (d <= bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

type At = Partial<Record<InsightKey, { val: InsightValue; area: AreaInsight }>>;

/** Für jeden Wert der nächste passende Reiseführer-Wert an dieser Stelle (Gegend bis 900 m, Rasterpunkt bis 400 m) */
export function insightsAt(ins: Loaded | null, lat: number, lon: number): At {
  const out: At = {};
  if (!ins) return out;
  const best: Partial<Record<InsightKey, number>> = {};
  const bi = Math.floor(lat / CELL);
  const bj = Math.floor(lon / CELL);
  for (let i = bi - 1; i <= bi + 1; i++)
    for (let j = bj - 1; j <= bj + 1; j++)
      for (const a of ins.grid.get(`${i}:${j}`) ?? []) {
        const d = distance(lat, lon, a.lat, a.lon);
        if (d > (a.kind === "raster" ? RASTER_RADIUS : RADIUS)) continue;
        for (const k of INSIGHT_KEYS) {
          const val = a.values[k];
          if (!val) continue;
          // Text-Auswertung einer Gegend geht vor, sonst der nächste Punkt
          const rank = d + (a.kind === "raster" ? 10_000 : 0);
          if (rank < (best[k] ?? Infinity)) {
            best[k] = rank;
            out[k] = { val, area: a };
          }
        }
      }
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const shareOf = (val: InsightValue) => WEB_WEIGHT * Math.max(0, Math.min(1, val.w ?? 1));

/** Ein Wert: gemessen und Reiseführer zusammen. Fehlt die Messung, zählt der Reiseführer-Wert allein. */
export function blendValue(measured: number | null | undefined, val: InsightValue | undefined): number | null {
  if (!val) return measured ?? null;
  if (measured === null || measured === undefined) return round1(val.v);
  const s = shareOf(val);
  return round1(measured * (1 - s) + val.v * s);
}

/** Alle Werte einer Stelle mischen; liefert die neuen Werte und was der Reiseführer je Wert beigetragen hat */
export function blendScores(
  scores: Record<string, number | null>,
  at: At,
): { scores: Record<string, number | null>; web: Partial<Record<InsightKey, WebPart>> } {
  const out = { ...scores };
  const web: Partial<Record<InsightKey, WebPart>> = {};
  for (const [k, hit] of Object.entries(at) as [InsightKey, At[InsightKey]][]) {
    if (!hit) continue;
    if (!(k in scores) && k !== "safety") continue;
    const measured = scores[k] ?? null;
    out[k] = blendValue(measured, hit.val);
    web[k] = {
      score: hit.val.v,
      measured,
      why: hit.val.why,
      area: hit.area.name,
      sources: hit.val.src.map((i) => hit.area.sources[i]).filter(Boolean),
      share: measured === null ? 1 : Math.round(shareOf(hit.val) * 100) / 100,
    };
  }
  return { scores: out, web };
}

export function webReason(w: WebPart) {
  const pct = w.share !== undefined && w.share < 1 ? `, zählt zu ${Math.round(w.share * 100)} %` : "";
  return `Reiseführer: ${w.score}/10, ${w.why}${pct}`;
}

/** Recherche zu einer Gegend für die Viertel-Seite: gleicher Name in der Nähe, sonst die nächste im Umkreis */
export async function insightNear(lat: number, lon: number, name: string): Promise<AreaInsight | null> {
  const { precomputedCovering } = await import("./precomputed");
  const pre = await precomputedCovering(lat, lon);
  if (!pre) return null;
  const ins = await loadInsights(pre.slug);
  if (!ins) return null;
  const n = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const byName = ins.areas.find(
    (a) => a.kind !== "raster" && n(a.name) === n(name.replace(/^Rund um (die |den |das )?/i, "")) && distance(lat, lon, a.lat, a.lon) < 2500,
  );
  return byName ?? nearestArea(ins, lat, lon, 700);
}
