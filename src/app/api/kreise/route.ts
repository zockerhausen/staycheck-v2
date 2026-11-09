import { rateLimit, tooMany } from "@/lib/ratelimit";
import { areaGpx, GPX_HEADERS } from "@/lib/area-gpx";

/** Umriss der besten Lage als GPX (alte Adresse mit ?a=…) */
export async function GET(request: Request) {
  if (!rateLimit(request, "kreise", 300)) return tooMany();
  return new Response(areaGpx(new URL(request.url).searchParams.get("a") ?? ""), { headers: GPX_HEADERS });
}
