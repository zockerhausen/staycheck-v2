import { cookies } from "next/headers";
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
};

export type Weights = Record<string, number>;

/** Cookie-Namen für Reise-Profil und zuletzt gewählte Stadt (funktioniert auch ohne Konto) */
export const PROFILE_COOKIE = "sc_profil";
export const CITY_COOKIE = "sc_stadt";

export async function getCriteria(): Promise<Criterion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("criteria")
    .select("key, label, description, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Criterion[];
}

export async function getCities(): Promise<City[]> {
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
}

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
  district_scores: { criterion_key: string; score: number }[];
};

/** Bezirke einer Stadt – ohne Stadt-Slug: alle Städte */
export async function getDistricts(citySlug?: string): Promise<District[]> {
  const supabase = await createClient();
  let query = supabase
    .from("districts")
    .select("id, slug, name, short_description, lat, lng, cities!inner(slug), district_scores(criterion_key, score)")
    .order("name");
  if (citySlug) query = query.eq("cities.slug", citySlug);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DistrictRow[]).map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    city: d.cities.slug,
    short_description: d.short_description,
    lat: d.lat,
    lng: d.lng,
    scores: Object.fromEntries(d.district_scores.map((s) => [s.criterion_key, s.score])),
  }));
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

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

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
