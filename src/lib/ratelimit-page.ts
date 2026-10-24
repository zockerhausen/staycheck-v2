import { headers } from "next/headers";
import { rateLimit } from "@/lib/ratelimit";

/** Rate-Limit für Seiten (nicht nur API-Routen): gleiche Bremse pro IP. */
export async function pageRateLimit(key: string, limit: number, windowMs = 60_000) {
  const h = await headers();
  return rateLimit(new Request("https://staycheck.local", { headers: { "x-forwarded-for": h.get("x-forwarded-for") ?? "" } }), key, limit, windowMs);
}
