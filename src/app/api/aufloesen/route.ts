import { NextResponse } from "next/server";
import { rateLimit, tooMany } from "@/lib/ratelimit";
import { resolveInput } from "@/lib/links";

// Link oder Name → mögliche Orte (für das Hotel-Duell)
export async function GET(request: Request) {
  if (!rateLimit(request, "aufloesen", 20)) return tooMany();
  const input = new URL(request.url).searchParams.get("u") ?? "";
  try {
    return NextResponse.json(await resolveInput(input));
  } catch {
    return NextResponse.json({ query: input, candidates: [], error: "Suche gerade nicht erreichbar." }, { status: 502 });
  }
}
