import { createClient } from "@/lib/supabase/server";

export type Criterion = {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
};

export type District = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  lat: number | null;
  lng: number | null;
  scores: Record<string, number>;
};

export type Weights = Record<string, number>;

export async function getCriteria(): Promise<Criterion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("criteria")
    .select("key, label, description, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Criterion[];
}

type DistrictRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  lat: number | null;
  lng: number | null;
  district_scores: { criterion_key: string; score: number }[];
};

export async function getDistricts(citySlug = "berlin"): Promise<District[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("districts")
    .select(
      "id, slug, name, short_description, lat, lng, cities!inner(slug), district_scores(criterion_key, score)",
    )
    .eq("cities.slug", citySlug)
    .order("name");
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DistrictRow[]).map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
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
    if (Number.isFinite(n)) weights[c.key] = Math.min(5, Math.max(0, Math.round(n)));
  }
  return weights;
}

export function weightsToQuery(weights: Weights): string {
  return new URLSearchParams(
    Object.entries(weights).map(([k, v]) => [k, String(v)]),
  ).toString();
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
  const { data } = await supabase
    .from("user_preferences")
    .select("criterion_key, weight")
    .eq("user_id", user.id);
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

/** Gewichte aus URL, sonst gespeicherte, sonst null */
export async function resolveWeights(
  params: Record<string, string | string[] | undefined>,
  criteria: Criterion[],
): Promise<{ weights: Weights | null; source: "url" | "saved" | null }> {
  const fromUrl = weightsFromParams(params, criteria);
  if (Object.keys(fromUrl).length > 0) return { weights: fromUrl, source: "url" };
  const saved = await getSavedWeights();
  return saved ? { weights: saved, source: "saved" } : { weights: null, source: null };
}
