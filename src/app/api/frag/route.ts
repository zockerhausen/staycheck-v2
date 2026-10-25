import { assistantEnabled, buildContext, callClaude, parseTarget, systemPrompt, type Turn } from "@/lib/assistant";
import { rateLimit, tooMany } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (data: unknown, status: number) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

/**
 * POST { ziel: {...}, frage: string, verlauf?: [{ rolle, text }] }
 * Antwort: Zeilen mit JSON (Text-Stücke, Quellen, Ende), damit die Antwort Wort für Wort erscheint.
 */
export async function POST(request: Request) {
  if (!assistantEnabled()) return json({ error: "Der Assistent ist bald verfügbar." }, 503);
  // Bremsen gegen Missbrauch (Kosten): pro Minute und pro Tag
  if (!rateLimit(request, "frag", 6)) return tooMany();
  if (!rateLimit(request, "frag-tag", 40, 24 * 3600_000)) return json({ error: "Für heute sind genug Fragen gestellt. Morgen geht es weiter." }, 429);
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "Ungültig" }, 415);

  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 8000) return json({ error: "Zu lang" }, 413);
    raw = JSON.parse(text);
  } catch {
    return json({ error: "Ungültig" }, 400);
  }
  const target = parseTarget(raw.ziel);
  const frage = typeof raw.frage === "string" ? raw.frage.trim().slice(0, 300) : "";
  if (!target || frage.length < 2) return json({ error: "Ungültige Frage" }, 400);

  // Verlauf: höchstens 3 frühere Fragen und Antworten, gekürzt
  const verlauf: Turn[] = Array.isArray(raw.verlauf)
    ? (raw.verlauf as unknown[])
        .slice(-6)
        .map((t) => t as { rolle?: unknown; text?: unknown })
        .filter((t) => (t.rolle === "du" || t.rolle === "ki") && typeof t.text === "string" && t.text.trim())
        .map((t) => ({ role: t.rolle === "du" ? ("user" as const) : ("assistant" as const), content: String(t.text).slice(0, 1500) }))
    : [];
  // Muss mit einer Nutzerfrage beginnen und sich abwechseln
  while (verlauf.length && verlauf[0].role !== "user") verlauf.shift();
  const messages: Turn[] = [];
  for (const t of [...verlauf, { role: "user" as const, content: frage }]) {
    if (messages.length && messages[messages.length - 1].role === t.role) messages[messages.length - 1] = t;
    else messages.push(t);
  }

  const ctx = await buildContext(target).catch(() => null);
  if (!ctx) return json({ error: "Viertel nicht gefunden" }, 404);

  let upstream: Response;
  try {
    upstream = await callClaude(systemPrompt(ctx.place, ctx.data, ctx.tips), messages);
  } catch {
    return json({ error: "Der Assistent antwortet gerade nicht. Versuch es gleich nochmal." }, 502);
  }
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 429 || upstream.status === 529 ? 503 : 502;
    return json({ error: "Der Assistent ist gerade ausgelastet. Versuch es gleich nochmal." }, status);
  }

  // Die SSE-Antwort von Claude in einfache Zeilen für den Browser übersetzen
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const seen = new Set<string>();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const reader = upstream.body!.getReader();
      let buf = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const line = chunk.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            let ev: { type?: string; delta?: { type?: string; text?: string; citation?: { url?: string; title?: string } }; content_block?: { type?: string } };
            try {
              ev = JSON.parse(line.slice(5));
            } catch {
              continue;
            }
            if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) send({ t: "text", v: ev.delta.text });
            else if (ev.type === "content_block_delta" && ev.delta?.type === "citations_delta") {
              const c = ev.delta.citation;
              if (c?.url && /^https?:\/\//.test(c.url) && !seen.has(c.url) && seen.size < 5) {
                seen.add(c.url);
                send({ t: "src", url: c.url, title: (c.title ?? c.url).slice(0, 120) });
              }
            } else if (ev.type === "content_block_start" && ev.content_block?.type === "server_tool_use") send({ t: "search" });
            else if (ev.type === "error") send({ t: "error", v: "Die Antwort wurde unterbrochen." });
          }
        }
        send({ t: "end" });
      } catch {
        send({ t: "error", v: "Die Antwort wurde unterbrochen." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
