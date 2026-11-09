// Bewertungen von mehreren Plattformen, auf eine gemeinsame Skala gebracht (0–10).
//
// Nur ECHTE Bewertungen: Tripadvisor (mit TRIPADVISOR_API_KEY) und Booking & Co. über Stay22 (mit STAY22_API_KEY, siehe stay22-api.ts).
// Ohne Schlüssel gibt es keine Bewertungen – es wird nie etwas ausgedacht. Alles läuft nur auf dem Server.
import { unstable_cache } from "next/cache";


export type Platform = "booking" | "google" | "tripadvisor" | "agoda" | "hostelworld" | "expedia" | "stay22";

export const PLATFORM: Record<Platform, { label: string; scale: 5 | 10 }> = {
  booking: { label: "Booking.com", scale: 10 },
  google: { label: "Google", scale: 5 },
  tripadvisor: { label: "Tripadvisor", scale: 5 },
  agoda: { label: "Agoda", scale: 10 },
  hostelworld: { label: "Hostelworld", scale: 10 },
  expedia: { label: "Expedia", scale: 10 },
  stay22: { label: "Booking & Co.", scale: 10 },
};

export type PlatformRating = {
  platform: Platform;
  /** Wert auf der Skala der Plattform (z. B. 4,5 von 5) */
  raw: number;
  /** Umgerechnet auf 0–10 */
  score: number;
  count: number;
  url?: string;
  /** Bild der Plattform für die Quellenangabe (z. B. Tripadvisor-Bubbles), nur von bekannten Adressen */
  badge?: string;
};

export type ReviewSnippet = { platform: Platform; score: number; text: string; when: string };

export type StayReviews = {
  platforms: PlatformRating[];
  /** Gesamtwert 0–10: nach Anzahl gewichtet, wenige Bewertungen werden zur Mitte gezogen */
  fair: number;
  total: number;
  /** Wie einig sind sich die Plattformen? (größter Abstand in Punkten) */
  spread: number;
  snippets: ReviewSnippet[];
  /** immer false: es gibt keine ausgedachten Beispieldaten mehr (Feld bleibt für ältere Stellen) */
  demo: boolean;
};

export type StayRef = { name: string; lat: number; lon: number; kind: string };

/** Ab hier gilt eine Unterkunft als „top bewertet“ */
export const TOP_FAIR = 8.5;

/* ---------- Zusammenrechnen ---------- */

const PRIOR = 7.5; // Mitte, zu der wenige Bewertungen gezogen werden
const PRIOR_WEIGHT = 60; // so viele „gedachte“ Bewertungen

export function combine(platforms: PlatformRating[], snippets: ReviewSnippet[], demo: boolean): StayReviews | null {
  const usable = platforms.filter((p) => p.count > 0 && Number.isFinite(p.score));
  if (!usable.length) return null;
  const total = usable.reduce((s, p) => s + p.count, 0);
  const sum = usable.reduce((s, p) => s + p.score * p.count, 0);
  const fair = (sum + PRIOR * PRIOR_WEIGHT) / (total + PRIOR_WEIGHT);
  const scores = usable.map((p) => p.score);
  return {
    platforms: [...usable].sort((a, b) => b.count - a.count),
    fair: Math.round(fair * 10) / 10,
    total,
    spread: Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10,
    snippets,
    demo,
  };
}

export const toTen = (raw: number, scale: 5 | 10) => Math.round((scale === 5 ? raw * 2 : raw) * 10) / 10;

/** „8,6“ */
export const fmtScore = (n: number) => n.toFixed(1).replace(".", ",");
/** Kurzes Urteil wie bei den Plattformen */
export function fairLabel(n: number) {
  if (n >= 9) return "Hervorragend";
  if (n >= 8.5) return "Sehr gut";
  if (n >= 8) return "Gut";
  if (n >= 7) return "Ordentlich";
  return "Durchwachsen";
}
export function agreement(spread: number) {
  if (spread <= 0.6) return { label: "Plattformen sind sich einig", tone: "good" as const };
  if (spread <= 1.2) return { label: "Leichte Unterschiede zwischen Plattformen", tone: "mid" as const };
  return { label: "Plattformen sind sich uneinig, genauer hinschauen", tone: "warn" as const };
}

/* ---------- Echte Quellen ---------- */

type Provider = (stay: StayRef) => Promise<{ ratings: PlatformRating[]; snippets: ReviewSnippet[] } | null>;

// --- Tripadvisor (Content API): Hotel per Name + Ort finden, dann Note + Anzahl. Sparsam: 2 Abrufe pro Unterkunft,
// danach aus dem Zwischenspeicher für alle Nutzer. Fehler (z. B. Tageslimit erreicht) werden NICHT gespeichert.
const TA_KEY = (process.env.TRIPADVISOR_API_KEY ?? "").trim();
const TA_DAYS = Math.min(30, Math.max(1, Number(process.env.TRIPADVISOR_CACHE_DAYS) || 7));
const TA_BASE = "https://api.content.tripadvisor.com/api/v1";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://staycheck.website";

async function taGet(path: string, params: Record<string, string>) {
  const q = new URLSearchParams({ key: TA_KEY, language: "de", ...params });
  const r = await fetch(`${TA_BASE}${path}?${q}`, {
    headers: { accept: "application/json", referer: SITE },
    cache: "no-store", // Zwischenspeichern macht unstable_cache (ohne Schlüssel im Speicher-Namen)
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`Tripadvisor ${r.status}`); // nicht speichern, später erneut versuchen
  return r.json() as Promise<Record<string, unknown>>;
}

/**
 * Ähnlichkeit zweier Unterkunfts-Namen (0–1), lieber zu streng als zu locker (eine falsche Bewertung ist schlimmer als keine):
 * „Hostel“ gegen „Hotel“ zählt als verschieden, und das erste prägende Wort (z. B. „Kiez“, „Pegasus“) muss bei beiden vorkommen.
 */
export function nameSimilarity(a: string, b: string) {
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 1);
  const GENERIC = new Set(["hotel", "hostel", "the", "and", "und", "by", "inn", "guesthouse", "guest", "house", "pension", "apartments", "apartment", "rooms", "suites", "bb", "gasthaus", "boutique", "residence"]);
  const ta = tokens(a);
  const tb = tokens(b);
  const kind = (t: string[]) => (t.includes("hostel") ? "hostel" : t.includes("hotel") ? "hotel" : null);
  const ka = kind(ta);
  const kb = kind(tb);
  if (ka && kb && ka !== kb) return 0;
  const A = ta.filter((w) => !GENERIC.has(w));
  const B = tb.filter((w) => !GENERIC.has(w));
  if (!A.length || !B.length) return ta.join(" ") === tb.join(" ") ? 1 : 0;
  const setB = new Set(B);
  const setA = new Set(A);
  if (!setB.has(A[0]) && !setA.has(B[0])) return 0;
  let same = 0;
  for (const w of setA) if (setB.has(w)) same++;
  return same / Math.min(setA.size, setB.size);
}

const taLocationId = unstable_cache(
  async (name: string, lat: number, lon: number): Promise<string | null> => {
    const j = await taGet("/location/search", { searchQuery: name.slice(0, 80), category: "hotels", latLong: `${lat},${lon}`, radius: "300", radiusUnit: "m" });
    const list = Array.isArray(j.data) ? (j.data as { location_id?: string; name?: string }[]) : [];
    const best = list
      .filter((x) => x.location_id && x.name)
      .map((x) => ({ id: String(x.location_id), sim: nameSimilarity(name, x.name!) }))
      .sort((a, b) => b.sim - a.sim)[0];
    return best && best.sim >= 0.6 ? best.id : null;
  },
  ["ta-id-v1"],
  { revalidate: 30 * 86400 },
);

const taDetails = unstable_cache(
  async (id: string): Promise<PlatformRating | null> => {
    const j = await taGet(`/location/${encodeURIComponent(id)}/details`, { currency: "EUR" });
    const raw = Number(j.rating);
    const count = Number(j.num_reviews);
    if (!Number.isFinite(raw) || !(count > 0)) return null;
    const url = typeof j.web_url === "string" && /^https:\/\/([a-z0-9-]+\.)*tripadvisor\.[a-z.]+\//i.test(j.web_url) ? j.web_url : undefined;
    const badge =
      typeof j.rating_image_url === "string" && /^https:\/\/([a-z0-9-]+\.)*(tripadvisor\.[a-z.]+|tacdn\.com)\//i.test(j.rating_image_url) ? j.rating_image_url : undefined;
    return { platform: "tripadvisor", raw, score: toTen(raw, 5), count, url, badge };
  },
  ["ta-details-v1"],
  { revalidate: TA_DAYS * 86400 },
);

const tripadvisor: Provider = async (stay) => {
  if (!TA_KEY) return null;
  const id = await taLocationId(stay.name, Number(stay.lat.toFixed(4)), Number(stay.lon.toFixed(4)));
  if (!id) return null;
  const r = await taDetails(id);
  return r ? { ratings: [r], snippets: [] } : null;
};

const PROVIDERS: Provider[] = [tripadvisor];

/** Ist überhaupt eine echte Bewertungsquelle angeschlossen? */
export const reviewsOn = Boolean(TA_KEY);

export async function reviewsFor(stay: StayRef, extra: PlatformRating[] = []): Promise<StayReviews | null> {
  const ratings: PlatformRating[] = [...extra];
  const snippets: ReviewSnippet[] = [];
  for (const p of PROVIDERS) {
    const r = await p(stay).catch(() => null);
    if (r) {
      ratings.push(...r.ratings);
      snippets.push(...r.snippets);
    }
  }
  return ratings.length ? combine(ratings, snippets, false) : null;
}

/** Für Listen: mehrere Unterkünfte auf einmal (Schlüssel = lat,lon). Höchstens `limit` werden bei den Quellen abgefragt (Abruf-Budget). */
export async function reviewsForMany(stays: StayRef[], limit = 30): Promise<Map<string, StayReviews>> {
  const out = new Map<string, StayReviews>();
  if (!PROVIDERS.length || !reviewsOn) return out;
  const list = stays.slice(0, limit);
  const res = await Promise.all(list.map((s) => reviewsFor(s)));
  list.forEach((s, i) => {
    const r = res[i];
    if (r) out.set(stayKey(s), r);
  });
  return out;
}
export const stayKey = (s: { lat: number; lon: number }) => `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`;
