import { NextResponse } from "next/server";
import { rateLimit, tooMany } from "@/lib/ratelimit";
import { getCities } from "@/lib/data";
import { distance } from "@/lib/geo";
import { matchPopular } from "@/lib/popular";

type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

// Reiseziele (Städte weltweit) für „Wohin geht deine Reise?“
export async function GET(request: Request) {
  if (!rateLimit(request, "ziele", 60)) return tooMany();
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  // Beliebte Reiseziele zuerst (die Kartensuche sortiert bei „London“ sonst London in Kanada nach oben)
  const top = matchPopular(q)
    .slice(0, 3)
    .map((p) => ({ ort: p.ort, land: p.land, region: "", lat: p.lat, lon: p.lon, known: null, popular: true }));
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "8");
    url.searchParams.set("lang", "de");
    url.searchParams.set("layer", "city");
    const [res, cities] = await Promise.all([
      fetch(url, { headers: { "User-Agent": "StayCheck/0.1" }, next: { revalidate: 86400 } }),
      getCities(),
    ]);
    if (!res.ok) throw new Error("Photon");
    const json = (await res.json()) as { features: PhotonFeature[] };
    const seen = new Set<string>();
    const results = json.features
      .map((f) => {
        const p = f.properties;
        const lat = f.geometry.coordinates[1];
        const lon = f.geometry.coordinates[0];
        // Geprüfte Stadt (mit unserer Viertel-Bewertung) in der Nähe?
        const known = cities.find((c) => c.districtCount > 0 && distance(lat, lon, c.lat, c.lng) < 30_000);
        return { ort: p.name ?? "", land: p.country ?? "", region: p.state ?? "", lat, lon, known: known?.slug ?? null, popular: false };
      })
      // Orte, die ein beliebtes Ziel schon abdeckt (z. B. ein Stadtbezirk von London), nicht doppelt zeigen
      .filter((r) => !top.some((t) => distance(r.lat, r.lon, t.lat, t.lon) < 20_000))
      .filter((r) => r.ort && !seen.has(`${r.ort}|${r.land}`) && seen.add(`${r.ort}|${r.land}`));
    return NextResponse.json({ results: [...top, ...results].slice(0, 8) });
  } catch {
    if (top.length) return NextResponse.json({ results: top }); // Kartensuche weg, beliebte Ziele gehen trotzdem
    return NextResponse.json({ results: [], error: "Suche gerade nicht erreichbar" }, { status: 502 });
  }
}
