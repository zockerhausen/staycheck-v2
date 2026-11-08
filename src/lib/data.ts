import { parseZiel, type Ziel } from "@/lib/ziel";
import { cookies } from "next/headers";
import { cache } from "react";
import { cleanExtras, decodeExtras, type Extras } from "@/lib/profile";
import { precomputedBySlug } from "./precomputed";
import { blendValue, insightsAt, loadInsights, webReason } from "./insights";
import { createClient } from "@/lib/supabase/server";

export type Criterion = {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
};

export type City = {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  zoom: number;
  districtCount: number;
};

export type District = {
  id: string;
  slug: string;
  name: string;
  city: string; // Stadt-Slug
  short_description: string | null;
  lat: number | null;
  lng: number | null;
  scores: Record<string, number>;
  /** Warum dieser Wert? (z. B. „25 Bars und Clubs in 600 m“ oder Begründung mit Quelle) */
  reasons?: Record<string, string>;
  /** Woher der Wert kommt: aus Kartendaten berechnet, aus Quellen belegt oder nur geschätzt */
  origin?: Record<string, "karte" | "quelle" | "schaetzung" | "gemischt">;
  /** Link zur Quelle (nur bei „quelle“) */
  links?: Record<string, string>;
};

export type Weights = Record<string, number>;

/** Cookie-Namen für Reise-Profil und zuletzt gewählte Stadt (funktioniert auch ohne Konto) */
export const PROFILE_COOKIE = "sc_profil";
export const CITY_COOKIE = "sc_stadt";
export const EXTRAS_COOKIE = "sc_extra";
export const ZIEL_COOKIE = "sc_ziel"; // gewähltes Reiseziel ohne eigene Bewertung (Ort, Land, Koordinaten)

export const getCriteria = cache(async (): Promise<Criterion[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("criteria")
    .select("key, label, description, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Criterion[];
});

export const getCities = cache(async (): Promise<City[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("slug, name, country, lat, lng, zoom, sort_order, districts(count)")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (Omit<City, "districtCount"> & { districts: { count: number }[] })[]).map((c) => ({
    slug: c.slug,
    name: c.name,
    country: c.country,
    lat: c.lat,
    lng: c.lng,
    zoom: c.zoom,
    districtCount: c.districts?.[0]?.count ?? 0,
  }));
});

export async function getCity(slug: string): Promise<City | null> {
  const cities = await getCities();
  return cities.find((c) => c.slug === slug) ?? null;
}

type DistrictRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  lat: number | null;
  lng: number | null;
  cities: { slug: string };
  district_scores: { criterion_key: string; score: number | null; note: string | null; source_url: string | null; checked_on: string | null }[];
};

// Diese Werte rechnet die Vorberechnung aus Kartendaten (gleiche Regeln wie für alle Städte)
const MAP_KEYS = ["transit", "nightlife", "food", "nature", "quiet", "budget"];

/** Bezirke einer Stadt – ohne Stadt-Slug: alle Städte */
export async function getDistricts(citySlug?: string): Promise<District[]> {
  const supabase = await createClient();
  let query = supabase
    .from("districts")
    .select("id, slug, name, short_description, lat, lng, cities!inner(slug), district_scores(criterion_key, score, note, source_url, checked_on)")
    .order("name");
  if (citySlug) query = query.eq("cities.slug", citySlug);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as DistrictRow[];
  // Kartenwerte aus der Vorberechnung (pro Stadt einmal laden)
  const pre = new Map<string, Awaited<ReturnType<typeof precomputedBySlug>>>();
  const guide = new Map<string, Awaited<ReturnType<typeof loadInsights>>>();
  for (const slug of new Set(rows.map((d) => d.cities.slug))) {
    pre.set(slug, await precomputedBySlug(slug).catch(() => null));
    guide.set(slug, await loadInsights(slug).catch(() => null));
  }

  return rows.map((d) => {
    const scores: Record<string, number> = {};
    const reasons: Record<string, string> = {};
    const origin: Record<string, "karte" | "quelle" | "schaetzung" | "gemischt"> = {};
    const links: Record<string, string> = {};
    for (const s of d.district_scores) {
      if (s.score != null) scores[s.criterion_key] = s.score;
      if (s.note) reasons[s.criterion_key] = s.note;
      if (s.source_url) links[s.criterion_key] = s.source_url;
      origin[s.criterion_key] = s.note && s.source_url ? "quelle" : "schaetzung";
    }
    const fixed = pre.get(d.cities.slug)?.city.fixed?.[d.slug];
    if (fixed) {
      for (const k of MAP_KEYS) {
        const v = fixed.scores[k];
        if (typeof v !== "number") continue;
        scores[k] = Math.max(1, Math.min(10, Math.round(v)));
        reasons[k] = fixed.reasons[k];
        origin[k] = "karte";
        delete links[k];
      }
      // Reiseführer (Wikivoyage) zur Hälfte dazu, abgestuft nach Verlässlichkeit – wie bei Unterkünften und Ecken
      if (d.lat != null && d.lng != null) {
        const at = insightsAt(guide.get(d.cities.slug) ?? null, d.lat, d.lng);
        for (const k of MAP_KEYS) {
          const hit = at[k as keyof typeof at];
          const v = fixed.scores[k];
          if (!hit || typeof v !== "number") continue;
          const mixed = blendValue(v, hit.val);
          if (mixed == null) continue;
          scores[k] = Math.max(1, Math.min(10, Math.round(mixed)));
          const share = Math.round(0.5 * Math.max(0, Math.min(1, hit.val.w ?? 1)) * 100);
          reasons[k] = `Karte: ${fixed.reasons[k]}. ${webReason({ score: hit.val.v, measured: v, why: hit.val.why, area: hit.area.name, sources: [], share: share / 100 })}`;
          origin[k] = "gemischt";
          const src = hit.val.src.map((i) => hit.area.sources[i]).find(Boolean);
          if (src) links[k] = src.url;
        }
      }
    }
    return {
      id: d.id,
      slug: d.slug,
      name: d.name,
      city: d.cities.slug,
      short_description: d.short_description,
      lat: d.lat,
      lng: d.lng,
      scores,
      reasons,
      origin,
      links,
    };
  });
}

/** Liest Gewichte (0–5) aus der URL, z. B. ?budget=5&nightlife=2 */
export function weightsFromParams(
  params: Record<string, string | string[] | undefined>,
  criteria: Criterion[],
): Weights {
  const weights: Weights = {};
  for (const c of criteria) {
    const raw = params[c.key];
    const n = Number(Array.isArray(raw) ? raw[0] : raw);
    if (raw !== undefined && Number.isFinite(n)) weights[c.key] = Math.min(5, Math.max(0, Math.round(n)));
  }
  return weights;
}

export function weightsToQuery(weights: Weights): string {
  return new URLSearchParams(Object.entries(weights).map(([k, v]) => [k, String(v)])).toString();
}

/** Profil-Cookie: "budget:5,nightlife:3,…" */
export function encodeProfile(weights: Weights) {
  return Object.entries(weights)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

export function decodeProfile(raw: string | undefined, criteria: Criterion[]): Weights | null {
  if (!raw) return null;
  const keys = new Set(criteria.map((c) => c.key));
  const weights: Weights = {};
  for (const part of raw.split(",")) {
    const [k, v] = part.split(":");
    const n = Number(v);
    if (keys.has(k) && Number.isFinite(n)) weights[k] = Math.min(5, Math.max(0, Math.round(n)));
  }
  return Object.keys(weights).length === criteria.length ? weights : null;
}

/** Angemeldet? Ohne Login-Cookie gar nicht erst beim Server nachfragen (spart eine Weltreise pro Seite).
 *  Mit Cookie prüft Supabase die Sitzung echt. Pro Seitenaufruf nur einmal (cache). */
export const getUser = cache(async () => {
  const hasSession = (await cookies()).getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSession) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function getSavedWeights(): Promise<Weights | null> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from("user_preferences").select("criterion_key, weight").eq("user_id", user.id);
  if (!data || data.length === 0) return null;
  return Object.fromEntries(data.map((r) => [r.criterion_key as string, r.weight as number]));
}

export async function getFavoriteIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return new Set();
  const { data } = await supabase.from("favorites").select("district_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.district_id as string));
}

export type SavedPlace = {
  id: string;
  name: string;
  subtitle: string | null;
  lat: number;
  lon: number;
  kind: string;
  match: number | null;
};

export async function getSavedPlaces(): Promise<SavedPlace[]> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("saved_places")
    .select("id, name, subtitle, lat, lon, kind, match")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as SavedPlace[];
}

/** Reise-Profil des Nutzers: zuerst Konto, sonst Cookie. */
export async function getProfile(criteria: Criterion[]): Promise<{ weights: Weights | null; source: "saved" | "cookie" | null }> {
  const saved = await getSavedWeights();
  if (saved && Object.keys(saved).length === criteria.length) return { weights: saved, source: "saved" };
  const cookie = decodeProfile((await cookies()).get(PROFILE_COOKIE)?.value, criteria);
  return cookie ? { weights: cookie, source: "cookie" } : { weights: null, source: null };
}

/** Gewichte aus URL, sonst Reise-Profil, sonst null */
export async function resolveWeights(
  params: Record<string, string | string[] | undefined>,
  criteria: Criterion[],
): Promise<{ weights: Weights | null; source: "url" | "saved" | "cookie" | null }> {
  const fromUrl = weightsFromParams(params, criteria);
  if (Object.keys(fromUrl).length > 0) return { weights: fromUrl, source: "url" };
  return getProfile(criteria);
}

export async function getLastCity(): Promise<string> {
  return (await cookies()).get(CITY_COOKIE)?.value ?? "berlin";
}

/** Reiseziel, das die Person selbst gewählt hat (ohne Standard-Stadt). */
/** Gewähltes Reiseziel einer Stadt ohne Handbewertung (z. B. Lissabon), streng geprüft. */
export async function getChosenZiel(): Promise<Ziel | null> {
  const v = (await cookies()).get(ZIEL_COOKIE)?.value;
  if (!v || v.length > 300) return null;
  return parseZiel(Object.fromEntries(new URLSearchParams(v)));
}

export async function getChosenCity(): Promise<string | null> {
  const v = (await cookies()).get(CITY_COOKIE)?.value;
  return v && /^[a-z-]{2,40}$/.test(v) ? v : null;
}

/** Extras des Reise-Profils (mit wem, was in Laufweite, Muss): zuerst Konto, sonst Cookie. */
export async function getExtras(): Promise<Extras> {
  const user = await getUser();
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("travel_with, extras, must_have").eq("id", user.id).maybeSingle();
    if (data && (data.travel_with || (data.extras as string[] | null)?.length || data.must_have)) {
      // Budget und No-Gos liegen (noch) nur im Cookie, nicht im Konto
      const fromCookie = decodeExtras((await cookies()).get(EXTRAS_COOKIE)?.value);
      return cleanExtras({ wer: data.travel_with, items: data.extras, must: data.must_have, preis: fromCookie.preis, nogo: fromCookie.nogo });
    }
  }
  return decodeExtras((await cookies()).get(EXTRAS_COOKIE)?.value);
}
