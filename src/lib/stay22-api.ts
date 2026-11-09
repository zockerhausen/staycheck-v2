// Echte, buchbare Unterkünfte mit Gäste-Note, Preis und direktem Link (Stay22 „Direct Travel API“).
// Nur mit STAY22_API_KEY (geheim, nur bei Vercel). Ist der Schlüssel noch nicht freigeschaltet („inactive“), kommt einfach nichts.
// Regeln von Stay22: nur für Live-Abfragen, höchstens ca. 1 Stunde zwischenspeichern, nichts dauerhaft in eine Datenbank.
import { STAY22_AID } from "./partner";
import { nameSimilarity } from "./reviews";

const KEY = (process.env.STAY22_API_KEY ?? "").trim();
export const liveOn = KEY.length > 0;

export type LiveStay = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Gäste-Note 0–10 und Anzahl (nur wenn Stay22 sie liefert) */
  rating: number | null;
  count: number | null;
  stars: number | null;
  /** Preis pro Nacht in EUR für die Reisedaten (günstigster Anbieter), sonst null */
  nightly: number | null;
  /** Direkter Link zur Unterkunft beim Anbieter (über Stay22, Provision für uns) */
  link: string;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const okLink = (u: unknown) => (typeof u === "string" && /^https:\/\/([a-z0-9-]+\.)*stay22\.com\//i.test(u) ? u : null);

/** Eine Antwort-Zeile vorsichtig lesen (Felder können fehlen) */
export function parseLiveStay(r: Record<string, unknown>, nights: number): LiveStay | null {
  const loc = (r.location ?? {}) as Record<string, unknown>;
  const co = (loc.coordinates ?? r.coordinates ?? {}) as Record<string, unknown>;
  const lat = num(co.lat ?? co.latitude ?? r.lat);
  const lon = num(co.lng ?? co.lon ?? co.longitude ?? r.lng);
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 160) : "";
  if (lat === null || lon === null || !name || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const rating = (r.rating ?? {}) as Record<string, unknown>;
  const value = num(rating.value);
  const count = num(rating.count);
  // Günstigster Anbieter mit Preis; Link von dort, sonst der allgemeine Link
  let best: { total: number; link: string | null } | null = null;
  const sup = (r.suppliers ?? {}) as Record<string, Record<string, unknown>>;
  for (const s of Object.values(sup)) {
    const total = num((s?.price as Record<string, unknown> | undefined)?.total);
    if (total !== null && total > 0 && (!best || total < best.total)) best = { total, link: okLink(s.link) };
  }
  const link = best?.link ?? okLink(r.url) ?? Object.values(sup).map((s) => okLink(s?.link)).find(Boolean) ?? null;
  if (!link) return null;
  return {
    id: String(r.id ?? `${lat},${lon}`),
    name,
    lat,
    lon,
    rating: value !== null && value > 0 && value <= 10 ? Math.round(value * 10) / 10 : null,
    count: count !== null && count > 0 ? Math.round(count) : null,
    stars: num(rating.hotelStars),
    nightly: best && nights > 0 ? Math.round(best.total / nights) : null,
    link,
  };
}

/**
 * Buchbare Unterkünfte im Umkreis (für die Reisedaten). null = nicht verfügbar (kein/inaktiver Schlüssel, Fehler).
 * Höchstens 1 Stunde zwischengespeichert (Regel von Stay22).
 */
export async function liveStaysNear(
  center: { lat: number; lon: number },
  radius: number,
  trip: { checkin: string; checkout: string; nights: number; adults: number },
  campaign: string,
): Promise<LiveStay[] | null> {
  if (!liveOn) return null;
  const q = new URLSearchParams({
    lat: center.lat.toFixed(5),
    lng: center.lon.toFixed(5),
    radius: String(Math.round(Math.min(5000, Math.max(200, radius)))),
    checkin: trip.checkin,
    checkout: trip.checkout,
    adults: String(trip.adults),
    currency: "EUR",
    lang: "de",
    pageSize: "100",
    campaign: campaign.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60) || "staycheck",
  });
  if (STAY22_AID) q.set("aid", STAY22_AID);
  for (const version of ["v3", "v2"]) {
    try {
      const r = await fetch(`https://api.stay22.com/${version}/accommodations?${q}`, {
        headers: { "X-API-KEY": KEY, accept: "application/json" },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(7000),
      });
      if (r.status === 404) continue; // andere Version versuchen
      if (!r.ok) return null; // 401/403 = Schlüssel (noch) nicht freigeschaltet, 429 = zu viele Anfragen
      const j = (await r.json()) as { results?: unknown[]; meta?: { nights?: unknown } };
      const nights = num(j.meta?.nights) ?? trip.nights;
      return (Array.isArray(j.results) ? j.results : [])
        .map((x) => (x && typeof x === "object" ? parseLiveStay(x as Record<string, unknown>, nights) : null))
        .filter((x): x is LiveStay => x !== null);
    } catch {
      return null;
    }
  }
  return null;
}

/** Passende buchbare Unterkunft zu einem Eintrag aus unserer Karte: nah dran (≤ 120 m) und gleicher Name */
export function matchLive<T extends { name: string; lat: number; lon: number }>(h: T, live: LiveStay[]): LiveStay | null {
  let best: { s: LiveStay; score: number } | null = null;
  for (const s of live) {
    const dy = (s.lat - h.lat) * 111_320;
    const dx = (s.lon - h.lon) * 111_320 * Math.cos((h.lat * Math.PI) / 180);
    const d = Math.hypot(dx, dy);
    if (d > 120) continue;
    const sim = nameSimilarity(h.name, s.name);
    if (sim < 0.6) continue;
    const score = sim - d / 1000;
    if (!best || score > best.score) best = { s, score };
  }
  return best?.s ?? null;
}
