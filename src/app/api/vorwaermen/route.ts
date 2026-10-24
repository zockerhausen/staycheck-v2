import { NextResponse } from "next/server";
import { after } from "next/server";
import { autoDistrictsCached, DEFAULT_WEIGHTS, hotelsNearCached, locationMatch, withDeadline, type AutoDistrict } from "@/lib/geo";
import { POPULAR } from "@/lib/popular";
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
  if (!city) return NextResponse.json({ error: "Unbekannte Stadt" }, { status: 404 });

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

  // Gleiche Werte wie auf /ziel/viertel, sonst trifft der Speicher nicht
  const jobs = pick.map((d) => {
    const name = d.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80);
    const center = { lat: Number(d.lat.toFixed(5)), lon: Number(d.lon.toFixed(5)) };
    return { name, work: hotelsNearCached(center, null, DEFAULT_WEIGHTS, 800, name).then(() => "ok" as const, () => "fehler" as const) };
  });
  // Höchstens so lange warten, wie die Funktion laufen darf; der Rest rechnet im Hintergrund weiter
  const left = Math.max(5_000, 110_000 - (Date.now() - started));
  const done = await withDeadline(Promise.all(jobs.map((j) => j.work)), left);
  if (done === "slow") after(() => Promise.all(jobs.map((j) => j.work)));

  return NextResponse.json({
    stadt: slug,
    viertel: districts.length,
    unterkuenfte: done === "slow" ? "läuft" : Object.fromEntries(jobs.map((j, i) => [j.name, done[i]])),
  });
}
