import { createClient } from "@/lib/supabase/server";
import type { Tip } from "@/lib/tips-shared";

export * from "@/lib/tips-shared";

// Ohne user_id: wer einen Tipp geschrieben hat, bleibt verborgen (auch nicht als Kennung).
const COLUMNS = "id, author_name, place_name, category, body, created_at";

/** Kennungen der eigenen Tipps (zum Löschen). Über eine Datenbank-Funktion, damit user_id nie öffentlich lesbar sein muss. */
export async function getMyTipIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_tip_ids");
  if (!error && Array.isArray(data)) return new Set((data as { id: string }[]).map((r) => r.id ?? (r as unknown as string)));
  // Rückfall, solange die Datenbank-Funktion noch nicht eingerichtet ist
  const { data: own } = await supabase.from("place_tips").select("id").eq("user_id", userId).limit(500);
  return new Set((own ?? []).map((r) => r.id as string));
}

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
