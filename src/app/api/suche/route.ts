import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geo";

// Ortssuche für den Lage-Check (Hotels, Hostels, Adressen – weltweit)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, 120);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const near = Number.isFinite(lat) && Number.isFinite(lon) && searchParams.has("lat") ? { lat, lon } : undefined;

  try {
    const results = await searchPlaces(q, near);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Suche gerade nicht erreichbar" }, { status: 502 });
  }
}
