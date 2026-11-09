import { rateLimit, tooMany } from "@/lib/ratelimit";
import { areaGpx, GPX_HEADERS } from "@/lib/area-gpx";

/** Umriss der besten Lage als GPX-Datei: /api/lage/<base64url>.gpx */
export async function GET(request: Request, { params }: { params: Promise<{ datei: string }> }) {
  if (!rateLimit(request, "kreise", 300)) return tooMany();
  const { datei } = await params;
  const code = datei.replace(/\.gpx$/, "");
  if (!/^[A-Za-z0-9_-]{4,4000}$/.test(code)) return new Response("Ungültig", { status: 400 });
  return new Response(areaGpx(Buffer.from(code, "base64url").toString("utf8")), { headers: GPX_HEADERS });
}
