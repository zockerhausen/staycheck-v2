import { NextResponse } from "next/server";
import { resolveInput } from "@/lib/links";

// Link oder Name → mögliche Orte (für das Hotel-Duell)
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("u") ?? "";
  try {
    return NextResponse.json(await resolveInput(input));
  } catch {
    return NextResponse.json({ query: input, candidates: [], error: "Suche gerade nicht erreichbar." }, { status: 502 });
  }
}
