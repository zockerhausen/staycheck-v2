import { createClient } from "@/lib/supabase/server";
import type { Tip } from "@/lib/tips-shared";

export * from "@/lib/tips-shared";

const COLUMNS = "id, user_id, author_name, place_name, category, body, created_at";

/** Tipps im Umkreis (ca. Meter) eines Punktes */
export async function getTipsNear(lat: number, lon: number, radius = 400): Promise<Tip[]> {
  const supabase = await createClient();
  const dLat = radius / 111_000;
  const dLon = radius / (111_000 * Math.cos((lat * Math.PI) / 180));
  const { data } = await supabase
    .from("place_tips")
    .select(COLUMNS)
    .gte("lat", lat - dLat)
    .lte("lat", lat + dLat)
    .gte("lon", lon - dLon)
    .lte("lon", lon + dLon)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as Tip[];
}

/** Alle Tipps eines Viertels */
export async function getTipsForDistrict(districtId: string): Promise<Tip[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("place_tips")
    .select(COLUMNS)
    .eq("district_id", districtId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as Tip[];
}
