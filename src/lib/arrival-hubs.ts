// Ankunftsorte für jede Stadt, nicht nur für die handgeprüften: Flughäfen und Stadtzentrum aus der Vorberechnung.
// Nur auf dem Server (liest vorberechnete Dateien).
import { HUBS, type Hub } from "./arrival";
import { distance } from "./geo";
import { precomputedCovering } from "./precomputed";

/**
 * Handgeprüfte Ankunftsorte (Berlin, Bangkok) oder aus der Vorberechnung: bis zu zwei Flughäfen
 * im Umkreis von 60 km plus das Stadtzentrum. Ohne Daten: leere Liste.
 */
export async function hubsNear(lat: number, lon: number, verifiedSlug?: string | null): Promise<Hub[]> {
  if (verifiedSlug && HUBS[verifiedSlug]) return HUBS[verifiedSlug];
  const pre = await precomputedCovering(lat, lon).catch(() => null);
  if (!pre) return [];
  const airports: Hub[] = (pre.airports ?? [])
    .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon) && distance(a.lat, a.lon, lat, lon) < 60_000)
    .slice(0, 2)
    // Zweiter Flughafen nur, wenn er nicht viel weiter weg ist (sonst eher ein kleiner Regionalflughafen)
    .filter((a, i, all) => i === 0 || a.km <= all[0].km * 1.8)
    .map((a) => ({ id: `ap-${a.iata || a.n}`, name: a.iata ? `${a.n} (${a.iata})` : a.n, kind: "airport", lat: a.lat, lon: a.lon }));
  // Zentrum nur zeigen, wenn man nicht schon mittendrin ist
  const center: Hub[] =
    distance(pre.lat, pre.lon, lat, lon) > 700 ? [{ id: "center", name: `Zentrum von ${pre.ort}`, kind: "center", lat: pre.lat, lon: pre.lon }] : [];
  return [...center, ...airports];
}
