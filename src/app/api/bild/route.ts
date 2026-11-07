import { rateLimit, tooMany } from "@/lib/ratelimit";

/**
 * Fotos von Wikimedia über unseren Server ausliefern.
 * So lädt der Browser nichts direkt von Wikimedia (keine IP-Adresse an Dritte, siehe LG München zu Google Fonts),
 * und das Vercel-Netz hält die Bilder 30 Tage vor.
 * Nur Bilder von Wikimedia Commons, nur JPEG, höchstens 4 MB: sonst keine Weiterleitung beliebiger Adressen.
 */
const HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);
const UA = "StayCheck/1.0 (https://staycheck-v2-git-main-passt.vercel.app; pauljonas.beth@me.com)";
const MAX = 4 * 1024 * 1024;

function allowed(raw: string | null): URL | null {
  if (!raw || raw.length > 600) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || !HOSTS.has(u.hostname) || u.username || u.password || u.port) return null;
    if (!u.pathname.startsWith("/wikipedia/commons/")) return null;
    return u;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!rateLimit(request, "bild", 120)) return tooMany();
  const url = allowed(new URL(request.url).searchParams.get("u"));
  if (!url) return new Response("Nicht erlaubt", { status: 400 });

  // Weiterleitungen selbst verfolgen und jedes Ziel prüfen: der Server ruft nie etwas außerhalb von Wikimedia ab
  let res: Response | null = null;
  let current: URL | null = url;
  for (let hop = 0; hop < 4 && current; hop++) {
    res = await fetch(current, { headers: { "User-Agent": UA }, redirect: "manual", signal: AbortSignal.timeout(8000) }).catch(() => null);
    const loc = res && res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!loc) break;
    current = allowed(new URL(loc, current).href);
    res = null;
  }
  if (!res?.ok || !(res.headers.get("content-type") ?? "").startsWith("image/jpeg")) {
    return new Response("Bild nicht verfügbar", { status: 502, headers: { "Cache-Control": "public, s-maxage=3600" } });
  }
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX) return new Response("Zu groß", { status: 502 });
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX) return new Response("Zu groß", { status: 502 });

  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
