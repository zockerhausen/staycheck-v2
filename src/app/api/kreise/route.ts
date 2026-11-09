import { rateLimit, tooMany } from "@/lib/ratelimit";

/**
 * GPX-Datei mit Kreisen um die besten Spots, damit die Preiskarte unseres Partners (Stay22) sie als Linien zeichnen kann.
 * Die Kreise stehen in der Adresse (c=lat,lon,radius;…): keine Daten aus der Datenbank, nichts Persönliches.
 */
export async function GET(request: Request) {
  if (!rateLimit(request, "kreise", 300)) return tooMany();
  const raw = new URL(request.url).searchParams.get("c") ?? "";
  const circles = raw
    .split(";")
    .slice(0, 15)
    .map((part) => part.split(",").map(Number))
    .filter(([lat, lon, r]) => Math.abs(lat) <= 85 && Math.abs(lon) <= 180 && r >= 50 && r <= 2000);
  const tracks = circles
    .map(([lat, lon, r]) => {
      const pts = Array.from({ length: 37 }, (_, i) => {
        const a = (i / 36) * 2 * Math.PI;
        const dLat = (r * Math.cos(a)) / 111320;
        const dLon = (r * Math.sin(a)) / (111320 * Math.cos((lat * Math.PI) / 180));
        return `<trkpt lat="${(lat + dLat).toFixed(6)}" lon="${(lon + dLon).toFixed(6)}"/>`;
      }).join("");
      return `<trk><name>Bester Spot</name><trkseg>${pts}</trkseg></trk>`;
    })
    .join("");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="StayCheck" xmlns="http://www.topografix.com/GPX/1/1">${tracks}</gpx>`;
  return new Response(gpx, {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
