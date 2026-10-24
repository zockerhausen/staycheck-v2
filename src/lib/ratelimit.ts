// Einfache Bremse gegen Missbrauch der offenen Schnittstellen (pro IP, pro Server-Instanz).
// Für härteren Schutz zusätzlich in Vercel → Firewall eine Rate-Limit-Regel anlegen.
const hits = new Map<string, number[]>();

export function rateLimit(request: Request, key: string, limit: number, windowMs = 60_000): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unbekannt";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(id, recent);
  if (hits.size > 5000) hits.clear(); // Speicher begrenzen
  return recent.length <= limit;
}

export function tooMany() {
  return new Response(JSON.stringify({ error: "Zu viele Anfragen. Warte kurz und versuch es nochmal." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60" },
  });
}
