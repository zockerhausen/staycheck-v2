import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// Hält die Login-Session frisch, bei jedem Seitenaufruf.
export async function middleware(request: NextRequest) {
  // Link aus einer E-Mail landet auf der Startseite statt auf /auth/callback (wenn die Rücksprung-Adresse in Supabase
  // nicht freigegeben ist): Code trotzdem einlösen bzw. abgelaufene Links verständlich melden.
  const url = request.nextUrl;
  if (url.pathname === "/") {
    const code = url.searchParams.get("code");
    if (code && /^[\w-]{8,200}$/.test(code)) return NextResponse.redirect(new URL(`/auth/callback?code=${code}`, request.url));
    if (url.searchParams.get("error_code") || url.searchParams.get("error") === "access_denied") return NextResponse.redirect(new URL("/login?fehler=link", request.url));
  }
  let response = NextResponse.next({ request });
  // Ohne Login-Cookie gibt es nichts aufzufrischen: keine Anfrage an Supabase (macht jede Seite schneller)
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
