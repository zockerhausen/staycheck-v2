import { VERIFIED_RADIUS } from "@/lib/popular";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { autoCityCached, autoDistrictsCached, DEFAULT_WEIGHTS, hotelsNearCached, locationMatch, withDeadline, type AutoDistrict } from "@/lib/geo";
import { POPULAR } from "@/lib/popular";
import { getCities } from "@/lib/data";
import { rateLimit, tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Rechnet ein beliebtes Reiseziel vorab durch (Viertel + Unterkünfte der wichtigsten Viertel),
 * damit Reisende es sofort sehen. Nimmt nur Städte aus unserer festen Liste an – mit fremden
 * Koordinaten lässt sich hier also keine Last auf die Kartenserver erzeugen.
 * Mehrfach aufrufen ist gewollt: was schon berechnet ist, kommt sofort aus dem Speicher.
 */
export async function GET(request: Request) {
  if (!rateLimit(request, "vorwaermen", 30)) return tooMany();
  const slug = new URL(request.url).searchParams.get("stadt") ?? "";
  const city = POPULAR.find((p) => p.slug === slug);
  if (!city) {
    // Geprüfte Städte (Berlin, Bangkok): nur die Zonen für die Karte, gleiche Werte wie in cityZones()
    const verified = (await getCities()).find((c) => c.slug === slug && c.districtCount > 0);
    if (!verified) return NextResponse.json({ error: "Unbekannte Stadt" }, { status: 404 });
    const work = autoCityCached(Number(verified.lat.toFixed(4)), Number(verified.lng.toFixed(4)), VERIFIED_RADIUS).then(
      (c) => ({ zonen: c.zones.length }),
      (e: unknown) => ({ fehler: String((e as Error)?.message ?? e).slice(0, 200) }),
    );
    const r = await withDeadline(work, 100_000);
    if (r === "slow") {
      after(() => work);
      return NextResponse.json({ stadt: slug, zonen: "läuft" });
    }
    return NextResponse.json({ stadt: slug, ...r });
  }

  const started = Date.now();
  const districtsWork = autoDistrictsCached(city.lat, city.lon).catch(() => null as AutoDistrict[] | null);
  const districts = await withDeadline(districtsWork, 90_000);
  if (districts === "slow") {
    after(() => districtsWork);
    return NextResponse.json({ stadt: slug, viertel: "läuft" });
  }
  if (!districts) return NextResponse.json({ stadt: slug, viertel: "fehler" }, { status: 502 });

  // Die Viertel, die Reisende am ehesten antippen: die ersten der Liste und die besten nach allgemeiner Lage
  const byGeneral = [...districts].sort((a, b) => locationMatch(b.scores, DEFAULT_WEIGHTS) - locationMatch(a.scores, DEFAULT_WEIGHTS));
  const pick = [...new Map([...districts.slice(0, 5), ...byGeneral.slice(0, 5)].map((d) => [d.slug, d])).values()];

  // Nacheinander (nicht gleichzeitig), damit die Kartenserver nicht überlastet werden.
  // Gleiche Werte wie auf /ziel/viertel, sonst trifft der Speicher nicht.
  const result: Record<string, "ok" | "fehler"> = {};
  for (const d of pick) {
    if (Date.now() - started > 80_000) break; // Rest beim nächsten Aufruf
    const name = d.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80);
    const center = { lat: Number(d.lat.toFixed(5)), lon: Number(d.lon.toFixed(5)) };
    const r = await withDeadline(
      hotelsNearCached(center, null, DEFAULT_WEIGHTS, 800, name).then(() => "ok" as const, () => "fehler" as const),
      Math.max(5_000, 110_000 - (Date.now() - started)),
    );
    result[name] = r === "slow" ? "fehler" : r;
    if (r !== "ok") break; // Server ausgelastet: aufhören und später weitermachen
  }
  const offen = pick.length - Object.values(result).filter((v) => v === "ok").length;

  return NextResponse.json({ stadt: slug, viertel: districts.length, unterkuenfte: result, offen });
}
