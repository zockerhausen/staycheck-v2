// Bewertungen von mehreren Plattformen, auf eine gemeinsame Skala gebracht (0–10).
//
// STAND: Es sind noch KEINE echten Quellen angeschlossen. Bis dahin gibt es Beispieldaten,
// aber nur auf der Vorschau (nie auf der Live-Seite) und immer deutlich als „Beispiel“ markiert.
// Echte Quellen kommen später in `PROVIDERS` (z. B. Tripadvisor mit TRIPADVISOR_API_KEY).
// Alles läuft nur auf dem Server.


export type Platform = "booking" | "google" | "tripadvisor" | "agoda" | "hostelworld" | "expedia";

export const PLATFORM: Record<Platform, { label: string; scale: 5 | 10 }> = {
  booking: { label: "Booking.com", scale: 10 },
  google: { label: "Google", scale: 5 },
  tripadvisor: { label: "Tripadvisor", scale: 5 },
  agoda: { label: "Agoda", scale: 10 },
  hostelworld: { label: "Hostelworld", scale: 10 },
  expedia: { label: "Expedia", scale: 10 },
};

export type PlatformRating = {
  platform: Platform;
  /** Wert auf der Skala der Plattform (z. B. 4,5 von 5) */
  raw: number;
  /** Umgerechnet auf 0–10 */
  score: number;
  count: number;
  url?: string;
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
  /** true = ausgedachte Beispieldaten, nicht echt */
  demo: boolean;
};

export type StayRef = { name: string; lat: number; lon: number; kind: string };

/** Ab hier gilt eine Unterkunft als „top bewertet“ */
export const TOP_FAIR = 8.5;

/** Beispieldaten nur außerhalb der Live-Seite (Vorschau, lokal) – oder ausdrücklich per REVIEWS_DEMO=1 */
export function demoEnabled() {
  if (process.env.REVIEWS_DEMO === "0") return false;
  return process.env.REVIEWS_DEMO === "1" || process.env.VERCEL_ENV !== "production";
}

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

/* ---------- Echte Quellen (später) ---------- */

type Provider = (stay: StayRef) => Promise<{ ratings: PlatformRating[]; snippets: ReviewSnippet[] } | null>;
const PROVIDERS: Provider[] = [
  // tripadvisor,  ← kommt, sobald TRIPADVISOR_API_KEY gesetzt ist
];

export async function reviewsFor(stay: StayRef): Promise<StayReviews | null> {
  const ratings: PlatformRating[] = [];
  const snippets: ReviewSnippet[] = [];
  for (const p of PROVIDERS) {
    const r = await p(stay).catch(() => null);
    if (r) {
      ratings.push(...r.ratings);
      snippets.push(...r.snippets);
    }
  }
  if (ratings.length) return combine(ratings, snippets, false);
  return demoEnabled() ? demoReviews(stay) : null;
}

/** Für Listen: mehrere Unterkünfte auf einmal (Schlüssel = lat,lon) */
export async function reviewsForMany(stays: StayRef[]): Promise<Map<string, StayReviews>> {
  const out = new Map<string, StayReviews>();
  const res = await Promise.all(stays.map((s) => reviewsFor(s)));
  stays.forEach((s, i) => {
    const r = res[i];
    if (r) out.set(stayKey(s), r);
  });
  return out;
}
export const stayKey = (s: { lat: number; lon: number }) => `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`;

/* ---------- Beispieldaten (ausgedacht, nur Vorschau) ---------- */

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const GOOD = [
  "Super Lage, alles Wichtige zu Fuß erreichbar.",
  "Sehr sauber, freundliches Personal, gerne wieder.",
  "Ruhig geschlafen, obwohl es mitten in der Stadt liegt.",
  "Tolles Frühstück und hilfsbereites Team an der Rezeption.",
  "Preis-Leistung stimmt, Zimmer wie auf den Fotos.",
  "Gute Anbindung, die Bahn ist gleich um die Ecke.",
];
const MID = [
  "Zimmer etwas klein, aber für ein paar Nächte völlig okay.",
  "Lage gut, WLAN war leider manchmal langsam.",
  "Sauber und praktisch, nichts Besonderes.",
  "Abends etwas laut von der Straße, sonst gut.",
];
const BAD = [
  "Hellhörig, Ohrstöpsel mitnehmen.",
  "Bad hätte eine Renovierung nötig.",
  "Check-in hat lange gedauert.",
];
const WHEN = ["vor 2 Wochen", "vor 1 Monat", "vor 3 Wochen", "vor 2 Monaten", "vor 5 Tagen", "vor 6 Wochen"];

export function demoReviews(stay: StayRef): StayReviews | null {
  const r = seeded(`${stay.name}|${stay.lat.toFixed(5)}|${stay.lon.toFixed(5)}`);
  const quality = 6.6 + r() * 2.9; // 6,6 bis 9,5
  const size = stay.kind === "hostel" ? 0.8 : stay.kind === "apartment" ? 0.3 : 1;
  const plats: Platform[] = ["booking", "google", "tripadvisor", "agoda", "expedia"];
  if (stay.kind === "hostel") plats.splice(1, 0, "hostelworld");
  const bias: Partial<Record<Platform, number>> = { google: 0.2, hostelworld: 0.1, expedia: 0.1 };

  const ratings: PlatformRating[] = [];
  for (const p of plats) {
    if (p !== "booking" && r() < 0.18) continue; // nicht überall gelistet
    const ten = Math.max(4, Math.min(9.9, quality + (bias[p] ?? 0) + (r() - 0.5) * 1.2));
    const scale = PLATFORM[p].scale;
    const raw = scale === 5 ? Math.round((ten / 2) * 10) / 10 : Math.round(ten * 10) / 10;
    const count = Math.round((40 + Math.pow(r(), 2) * 3200) * size * (p === "booking" || p === "google" ? 1.6 : 0.6));
    ratings.push({ platform: p, raw, score: toTen(raw, scale), count: Math.max(8, count) });
  }

  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  const pool = quality >= 8.5 ? [GOOD, GOOD, MID] : quality >= 7.5 ? [GOOD, MID, BAD] : [MID, BAD, GOOD];
  const used = new Set<string>();
  const snippets: ReviewSnippet[] = [];
  for (const list of pool) {
    let t = pick(list);
    for (let i = 0; i < 4 && used.has(t); i++) t = pick(list);
    if (used.has(t)) continue;
    used.add(t);
    const rt = pick(ratings);
    const s = list === GOOD ? 8.6 + r() * 1.3 : list === MID ? 6.8 + r() * 1.4 : 4.5 + r() * 1.8;
    snippets.push({ platform: rt.platform, score: Math.round(s * 10) / 10, text: t, when: pick(WHEN) });
  }
  return combine(ratings, snippets, true);
}
