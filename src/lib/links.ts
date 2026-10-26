// Macht aus einem eingefügten Link (Booking, Hostelworld, Agoda, Google Maps …) oder einem Namen einen Ort.
import { searchPlaces, type Place } from "./geo";

const UA = "Mozilla/5.0 (compatible; StayCheck/0.1; +https://github.com/zockerhausen/staycheck-v2)";

// Sicherheit: Der Server ruft nur Seiten dieser Anbieter ab (kein Abruf beliebiger Adressen → kein SSRF).
const FETCH_ALLOWED = [
  "booking.com",
  "hostelworld.com",
  "agoda.com",
  "hotels.com",
  "expedia.com",
  "expedia.de",
  "google.com",
  "maps.app.goo.gl",
  "goo.gl",
];

export function isFetchAllowed(url: URL) {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return FETCH_ALLOWED.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Folgt Weiterleitungen Schritt für Schritt und prüft jedes Ziel. */
async function safeFetch(url: URL, maxHops = 4): Promise<Response | null> {
  let current = url;
  for (let i = 0; i <= maxHops; i++) {
    if (!isFetchAllowed(current)) return null;
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": UA, "Accept-Language": "de,en" },
      signal: AbortSignal.timeout(5000),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current);
      continue;
    }
    return res;
  }
  return null;
}

export type ResolveResult = { query: string; candidates: Place[]; error?: string };

const COUNTRY: Record<string, string> = {
  de: "Deutschland", th: "Thailand", vn: "Vietnam", es: "Spanien", pt: "Portugal", fr: "Frankreich", it: "Italien",
  nl: "Niederlande", gb: "Großbritannien", us: "USA", id: "Indonesien", my: "Malaysia", kh: "Kambodscha", la: "Laos",
  jp: "Japan", at: "Österreich", ch: "Schweiz", cz: "Tschechien", pl: "Polen", gr: "Griechenland", mx: "Mexiko",
};

const unslug = (s: string) =>
  decodeURIComponent(s)
    .replace(/\.[a-z]{2}(-[a-z]{2})?\.html?$/i, "")
    .replace(/\.html?$/i, "")
    .replace(/[-_+]+/g, " ")
    .trim();

function coordsPlace(lat: number, lon: number, name?: string): Place {
  return { name: name || "Ort aus Link", subtitle: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon, kind: "other" };
}

/** Folgt Kurzlinks (maps.app.goo.gl, bit.ly …) bis zur Ziel-URL. */
async function expand(url: URL): Promise<URL> {
  if (!/(goo\.gl|maps\.app|booking\.com\/Share)/i.test(url.href) || !isFetchAllowed(url)) return url;
  let current = url;
  try {
    for (let i = 0; i < 4; i++) {
      const res = await fetch(current, { redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
      const loc = res.headers.get("location");
      if (!(res.status >= 300 && res.status < 400 && loc)) break;
      const next = new URL(loc, current);
      if (!isFetchAllowed(next)) break;
      current = next;
    }
  } catch {
    // ignorieren, wir arbeiten mit dem, was wir haben
  }
  return current;
}

/** Liest Titel/Koordinaten aus der Seite selbst (klappt nicht bei jeder Seite). */
async function sniffPage(url: URL): Promise<{ title?: string; lat?: number; lon?: number }> {
  try {
    const res = await safeFetch(url);
    if (!res || !res.ok) return {};
    // Höchstens 400 KB lesen (große Seiten nicht komplett in den Speicher laden)
    let html = "";
    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    while (reader && html.length < 400_000) {
      const { value, done } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
    }
    await reader?.cancel().catch(() => undefined);
    html = html.slice(0, 400_000);
    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1];
    const lat = Number(meta("place:location:latitude") ?? meta("og:latitude") ?? html.match(/"latitude"\s*:\s*"?(-?\d+\.\d+)/)?.[1]);
    const lon = Number(meta("place:location:longitude") ?? meta("og:longitude") ?? html.match(/"longitude"\s*:\s*"?(-?\d+\.\d+)/)?.[1]);
    const title = (meta("og:title") ?? html.match(/<title>([^<]+)<\/title>/i)?.[1])?.split(/[|–-]\s/)[0]?.trim();
    return { title, lat: Number.isFinite(lat) ? lat : undefined, lon: Number.isFinite(lon) ? lon : undefined };
  } catch {
    return {};
  }
}

export async function resolveInput(input: string): Promise<ResolveResult> {
  const raw = input.trim().slice(0, 500);
  if (raw.length < 3) return { query: raw, candidates: [] };

  let url: URL | null = null;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : raw.includes(".") && !raw.includes(" ") ? `https://${raw}` : "x:");
    if (url.protocol === "x:") url = null;
  } catch {
    url = null;
  }

  // Kein Link → normale Suche
  if (!url) return { query: raw, candidates: await searchPlaces(raw) };

  url = await expand(url);
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  // Anbieter nur am Ende der Adresse erkennen (booking.com.evil.io zählt nicht als Booking)
  const is = (re: RegExp) => re.test(host);
  const path = url.pathname;

  // Google Maps: Koordinaten stehen meist direkt im Link
  if (is(/(^|\.)google\.[a-z.]{2,6}$|(^|\.)goo\.gl$/)) {
    const name = path.match(/\/place\/([^/@]+)/)?.[1];
    const at = url.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? url.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const q = url.searchParams.get("q") ?? url.searchParams.get("query") ?? url.searchParams.get("destination");
    const qc = q?.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    const label = name ? unslug(name) : undefined;
    if (at) {
      const lat = Number(at[1]);
      const lon = Number(at[2]);
      const near = label ? await searchPlaces(label, { lat, lon }).catch(() => []) : [];
      const close = near.filter((p) => Math.abs(p.lat - lat) < 0.01 && Math.abs(p.lon - lon) < 0.01);
      return { query: label ?? "Google-Maps-Ort", candidates: [coordsPlace(lat, lon, label), ...close].slice(0, 5) };
    }
    if (qc) return { query: q!, candidates: [coordsPlace(Number(qc[1]), Number(qc[2]))] };
    if (label || q) return { query: label ?? q!, candidates: await searchPlaces(label ?? q!) };
  }

  // Airbnb verrät die genaue Lage erst nach der Buchung
  if (is(/(^|\.)airbnb\.[a-z.]{2,6}$/)) {
    return {
      query: "",
      candidates: [],
      error: "Airbnb zeigt die genaue Adresse erst nach der Buchung. Gib die Straße oder Gegend aus dem Inserat ein.",
    };
  }

  let name: string | undefined;
  let hint: string | undefined;

  if (is(/(^|\.)booking\.com$/)) {
    // /hotel/de/generator-berlin-mitte.de.html
    const m = path.match(/\/hotel\/([a-z]{2})\/([^/?]+)/i);
    if (m) {
      name = unslug(m[2]);
      hint = COUNTRY[m[1].toLowerCase()];
    }
  } else if (is(/(^|\.)hostelworld\.[a-z.]{2,6}$/)) {
    // /pwa/hosteldetails.php/Name/Stadt/12345  oder  /hostels/p/12345/name/
    const a = path.match(/hosteldetails\.php\/([^/]+)\/([^/]+)/i);
    const b = path.match(/\/hostels\/p\/\d+\/([^/?]+)/i);
    if (a) {
      name = unslug(a[1]);
      hint = unslug(a[2]);
    } else if (b) name = unslug(b[1]);
  } else if (is(/(^|\.)agoda\.[a-z.]{2,6}$/)) {
    // /de-de/name-of-hotel/hotel/bangkok-th.html
    const m = path.match(/\/([^/]+)\/hotel\/([^/]+)/i);
    if (m) {
      name = unslug(m[1]);
      hint = unslug(m[2]).replace(/\s[a-z]{2}$/i, "");
    }
  } else if (is(/(^|\.)hotels\.com$|(^|\.)expedia\.[a-z.]{2,6}$/)) {
    const m = path.match(/\/(?:ho\d+|h\d+)\/([^/?]+)/i) ?? path.match(/\/([^/]+)-hotels?-/i);
    if (m) name = unslug(m[1]);
  }

  // Bei bekannten Anbietern zusätzlich die Seite lesen (Titel, manchmal Koordinaten). Andere Seiten rufen wir nie ab.
  const page = isFetchAllowed(url) ? await sniffPage(url) : {};
  if (page.lat !== undefined && page.lon !== undefined) {
    const label = page.title ?? name;
    return { query: label ?? host, candidates: [coordsPlace(page.lat, page.lon, label)] };
  }
  name = name ?? page.title;
  if (!name) {
    return { query: host, candidates: [], error: "Aus diesem Link konnten wir die Unterkunft nicht erkennen. Gib einfach den Namen ein." };
  }

  const query = hint ? `${name} ${hint}` : name;
  let candidates = await searchPlaces(query);
  if (candidates.length === 0 && hint) candidates = await searchPlaces(name);
  return { query, candidates };
}
