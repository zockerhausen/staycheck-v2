// Fotos für Viertel und Ecken: frei lizenzierte Bilder von Wikipedia/Wikimedia Commons.
// 1) Gibt es einen Wikipedia-Artikel mit diesem Namen in der Nähe? Dann sein Titelbild.
// 2) Sonst ein gutes Foto, das in Wikimedia Commons ganz in der Nähe aufgenommen wurde.
// Immer mit Urheber und Lizenz (Pflicht bei CC-Lizenzen). Läuft nur auf dem Server, Ergebnis 30 Tage im Speicher.

import { unstable_cache } from "next/cache";
import { distance } from "./score";

export type AreaPhoto = { url: string; credit: string; license: string; source: string };

const UA = "StayCheck/1.0 (https://staycheck-v2-git-main-passt.vercel.app; pauljonas.beth@me.com)";
// Karten, Wappen, Pläne, Innenräume usw. sind keine guten Viertel-Fotos
const BAD = /(map|karte|plan|locator|location|lage|wappen|coat[_ ]of[_ ]arms|flag|flagge|logo|sign|schild|diagram|interior|innen|menu|ticket|stamp|briefmarke|\.svg|\.png|\.tif|\.gif|\.pdf)/i;

async function api(host: string, params: Record<string, string>) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!r.ok) throw new Error(`wiki ${r.status}`);
  return r.json();
}

const strip = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

type Info = { url?: string; thumburl?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, { value?: string }> };

/** Datei-Infos inkl. Lizenz holen und prüfen, ob sie als Viertel-Foto taugt */
function toPhoto(title: string, ii: Info | undefined): AreaPhoto | null {
  if (!ii?.thumburl || ii.mime !== "image/jpeg") return null;
  if (BAD.test(title)) return null;
  if (!ii.width || !ii.height || ii.width < 900 || ii.width < ii.height * 1.15) return null; // quer und groß genug
  const meta = ii.extmetadata ?? {};
  const license = strip(meta.LicenseShortName?.value ?? "");
  if (!/^(cc|public domain|pd)/i.test(license)) return null; // nur freie Lizenzen
  const credit = strip(meta.Artist?.value ?? "") || "Wikimedia Commons";
  return { url: ii.thumburl, credit, license, source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}` };
}

async function fileInfo(titles: string[]): Promise<Map<string, Info>> {
  if (!titles.length) return new Map();
  const j = await api("commons.wikimedia.org", {
    action: "query",
    titles: titles.slice(0, 40).join("|"),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "900",
  });
  const out = new Map<string, Info>();
  for (const p of j?.query?.pages ?? []) if (p?.title && p.imageinfo?.[0]) out.set(p.title, p.imageinfo[0]);
  return out;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function fromWikipedia(name: string, city: string, lat: number, lon: number): Promise<AreaPhoto | null> {
  for (const host of ["en.wikipedia.org", "de.wikipedia.org"]) {
    const j = await api(host, {
      action: "query",
      titles: [name, `${name}, ${city}`, `${name} (${city})`].join("|"),
      redirects: "1",
      prop: "pageimages|coordinates",
      piprop: "name",
    }); // Netzfehler nicht abfangen: dann wird auch nichts (Falsches) gespeichert
    const pages: { title: string; pageimage?: string; coordinates?: { lat: number; lon: number }[] }[] = j?.query?.pages ?? [];
    const hit = pages.find((p) => p.pageimage && p.coordinates?.[0] && distance(p.coordinates[0].lat, p.coordinates[0].lon, lat, lon) < 3000);
    if (!hit?.pageimage) continue;
    const title = `File:${hit.pageimage.replace(/_/g, " ")}`;
    const info = await fileInfo([title]);
    const photo = toPhoto(title, info.get(title));
    if (photo) return photo;
  }
  return null;
}

async function fromNearby(name: string, lat: number, lon: number, radius: number): Promise<AreaPhoto | null> {
  const j = await api("commons.wikimedia.org", {
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: String(radius),
    gslimit: "40",
    gsnamespace: "6",
  });
  const hits: { title: string; dist: number }[] = j?.query?.geosearch ?? [];
  const n = norm(name);
  const candidates = hits.filter((h) => !BAD.test(h.title)).slice(0, 30);
  const info = await fileInfo(candidates.map((h) => h.title));
  const scored = candidates
    .map((h) => ({ h, photo: toPhoto(h.title, info.get(h.title)) }))
    .filter((x): x is { h: { title: string; dist: number }; photo: AreaPhoto } => Boolean(x.photo))
    .map((x) => {
      const ii = info.get(x.h.title)!;
      const named = n.length > 3 && norm(x.h.title).includes(n) ? 3 : 0;
      const big = (ii.width ?? 0) >= 2000 ? 1 : 0;
      return { ...x, score: named + big - x.h.dist / radius };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.photo ?? null;
}

async function findPhoto(name: string, city: string, lat: number, lon: number, radius: number): Promise<AreaPhoto | null> {
  const wiki = await fromWikipedia(name, city, lat, lon);
  if (wiki) return wiki;
  return fromNearby(name, lat, lon, radius);
}

const photoCached = unstable_cache(
  async (name: string, city: string, lat: number, lon: number, radius: number) => findPhoto(name, city, lat, lon, radius),
  ["area-photo-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/** Foto für eine Gegend (oder null). Koordinaten werden gerundet, damit der Speicher trifft. */
export function areaPhoto(name: string, city: string, lat: number, lon: number, radius = 350): Promise<AreaPhoto | null> {
  const clean = name.replace(/[\u0000-\u001f<>|]/g, "").trim().slice(0, 80);
  if (!clean) return Promise.resolve(null);
  return photoCached(clean, city.slice(0, 60), Number(lat.toFixed(4)), Number(lon.toFixed(4)), radius)
    .then((p) => (p ? { ...p, url: `/api/bild?u=${encodeURIComponent(p.url)}` } : null)) // über unseren Server, nicht direkt von Wikimedia
    .catch(() => null);
}

/**
 * Mehrere Fotos auf einmal, höchstens `waitMs` warten.
 * `rest` an after() geben: dann laden die fehlenden im Hintergrund in den Speicher (nächstes Mal sofort da).
 */
export async function areaPhotos(
  items: { key: string; name: string; lat: number; lon: number }[],
  city: string,
  waitMs = 2500,
): Promise<{ photos: Record<string, AreaPhoto>; rest: Promise<unknown> }> {
  const out: Record<string, AreaPhoto> = {};
  const rest = Promise.all(
    items.map(async (it) => {
      const p = await areaPhoto(it.name, city, it.lat, it.lon);
      if (p) out[it.key] = p;
    }),
  );
  await Promise.race([rest, new Promise((r) => setTimeout(r, waitMs))]);
  return { photos: { ...out }, rest };
}
