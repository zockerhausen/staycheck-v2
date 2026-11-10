import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProfileFromCookie } from "@/app/actions";

const TYPES = new Set(["signup", "recovery", "email", "email_change", "magiclink", "invite"]);

// Link aus E-Mails mit Einmal-Code (token_hash). Funktioniert auch, wenn die E-Mail in einem anderen Browser
// geöffnet wird als dem, in dem man sich registriert hat (z. B. App auf dem Homescreen → Safari).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "";
  const wanted = searchParams.get("next") ?? (type === "recovery" ? "/passwort" : "/");
  const next = /^\/(?![\/\\])[^\s\\]*$/.test(wanted) ? wanted : "/";

  if (token_hash && token_hash.length < 300 && TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as "signup" | "recovery" | "email" | "email_change" | "magiclink" | "invite" });
    if (!error) {
      await syncProfileFromCookie();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?fehler=${type === "recovery" ? "link" : "bestaetigung"}`);
}
