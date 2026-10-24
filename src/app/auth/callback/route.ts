import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProfileFromCookie } from "@/app/actions";

// Hierhin führt der Bestätigungslink aus der Registrierungs-E-Mail.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) await syncProfileFromCookie();
    if (!error) return NextResponse.redirect(`${origin}${/^\/(?![\/\\])[^\s\\]*$/.test(next) ? next : "/"}`);
  }
  return NextResponse.redirect(`${origin}/login?fehler=bestaetigung`);
}
