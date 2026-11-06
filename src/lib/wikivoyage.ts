// Reiseführer-Wissen aus Wikivoyage (freier Reiseführer der Wikimedia, Lizenz CC BY-SA 4.0).
// Sucht den Stadtteil-Artikel, der am nächsten an einer Gegend liegt (zuerst Deutsch, sonst Englisch),
// und holt seine Einleitung. Immer mit Quelle, Link und Lizenz (Pflicht bei CC BY-SA).
// Läuft nur auf dem Server, Ergebnis 30 Tage im Speicher. Fließt (noch) nicht in den Score ein.

import { unstable_cache } from "next/cache";

export type GuideText = { title: string; text: string; url: string; lang: "de" | "en"; distKm: number };

const UA = "StayCheck/1.0 (https://staycheck-v2-git-main-passt.vercel.app; pauljonas.beth@me.com)";

async function api(lang: "de" | "en", params: Record<string, string>) {
  const url = `https://${lang}.wikivoyage.org/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!r.ok) throw new Error(`wikivoyage ${r.status}`);
  return r.json();
}

/** Einleitung säubern und auf ganze Sätze kürzen (höchstens ca. 480 Zeichen) */
function tidy(text: string): string {
  const t = text
    .replace(/\s*\([^)]*\b(Koordinaten|coordinates)\b[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= 480) return t;
  const cut = t.slice(0, 480);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 120 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")} …`;
}

// Nur Einleitung und Überblick („Hintergrund“ / „Understand“), nicht Anreise, Preise oder Adressen
const OVERVIEW = /^(hintergrund|orientierung|understand|orientation|overview)$/i;
function overview(full: string): string {
  const out: string[] = [];
  let keep = true;
  for (const line of full.split("\n")) {
    const h = line.match(/^=+\s*(.*?)\s*=+$/);
    if (h) {
      keep = OVERVIEW.test(h[1]);
      continue;
    }
    if (keep && line.trim()) out.push(line.trim());
  }
  return out.join(" ");
}

async function findIn(lang: "de" | "en", lat: number, lon: number): Promise<GuideText | null> {
  const geo = await api(lang, { action: "query", list: "geosearch", gscoord: `${lat}|${lon}`, gsradius: "4000", gslimit: "30" });
  type Hit = { title: string; dist: number };
  const hits: Hit[] = (geo?.query?.geosearch ?? []).filter((h: Hit) => typeof h?.title === "string" && typeof h?.dist === "number");
  // Nur Stadtteil-Artikel („Lissabon/Alfama“), keine ganze Stadt: die sagt über die Ecke zu wenig
  const district = hits.filter((h) => h.title.includes("/") && !/\/(Umgebung|Anreise|Get in)/i.test(h.title)).sort((a, b) => a.dist - b.dist)[0];
  if (!district || district.dist > 3500) return null;
  const ex = await api(lang, { action: "query", prop: "extracts", explaintext: "1", exsectionformat: "wiki", titles: district.title, redirects: "1" });
  const page = ex?.query?.pages?.[0];
  const text = typeof page?.extract === "string" ? tidy(overview(page.extract)) : "";
  if (text.length < 60) return null; // zu wenig, um etwas zu sagen
  return {
    title: String(page.title ?? district.title),
    text,
    url: `https://${lang}.wikivoyage.org/wiki/${encodeURIComponent(String(page.title ?? district.title).replace(/ /g, "_")).replace(/%2F/g, "/")}`,
    lang,
    distKm: Math.round(district.dist / 100) / 10,
  };
}

const cached = unstable_cache(
  async (lat: number, lon: number) => (await findIn("de", lat, lon)) ?? (await findIn("en", lat, lon)),
  ["wikivoyage-v2"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/** Wikivoyage-Text zur Gegend (oder null). Fehler beim Abruf = null, die Seite lädt trotzdem. */
export function guideNear(lat: number, lon: number): Promise<GuideText | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Promise.resolve(null);
  return cached(Number(lat.toFixed(3)), Number(lon.toFixed(3))).catch(() => null);
}
