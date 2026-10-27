// Website-Wissen für Viertel und Ecken (läuft in GitHub Actions, .github/workflows/webwissen.yml).
//
// Für jede vorberechnete Stadt: die wichtigsten Gegenden bestimmen (Viertel + Ecken aus mehreren Reise-Profilen),
// dann recherchiert Claude mit Websuche, was seriöse Reisequellen über genau diese Gegend sagen.
// Ergebnis: data/insights/<stadt>.json mit Werten (1–10), kurzer Begründung und den echten Quellen.
//
// Ehrlichkeit:
// - Eine Quelle zählt nur, wenn ihre Adresse wirklich in den Suchergebnissen vorkam (keine erfundenen Links).
// - Ein Wert zählt nur mit mindestens zwei unabhängigen Quellen (verschiedene Websites).
// - Texte sind eigene kurze Zusammenfassungen, keine Zitate.
//
// Aufruf: node research.mjs  (Umgebung: ANTHROPIC_API_KEY, NUR=slug,slug, MAX_USD=150, MAX_AREAS=22)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { findSpots, type Spot } from "../../src/lib/zones";

const KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODEL = process.env.MODEL || "claude-sonnet-5-5";
const ONLY = (process.env.NUR ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_USD = Number(process.env.MAX_USD || 150);
const MAX_AREAS = Number(process.env.MAX_AREAS || 22);
const FRESH_DAYS = Number(process.env.FRESH_DAYS || 75); // jünger: nicht neu recherchieren
const PARALLEL = 3;

// Preise (USD) für die Kostenbremse: Eingabe/Ausgabe je Million Tokens, Websuche je Suche.
const PRICE = { in: 2 / 1e6, out: 10 / 1e6, search: 10 / 1000 };

import { INSIGHT_KEYS as KEYS, type AreaInsight, type CityInsights } from "../../src/lib/insight-types";

type Zone = { lat: number; lon: number; s: number[] };
type Place = { n: string; lat: number; lon: number; l: number };
type District = { name: string; lat: number; lon: number; distKm: number };
type RawCity = { slug: string; ort: string; land: string; city: { zones: Zone[]; step: number; places?: Place[]; districts: District[] } };

// Verschiedene Reise-Profile, damit die Ecken für Nachtschwärmer, Ruhige, Sparer und Foodies alle dabei sind
const PERSONAS: Record<string, number>[] = [
  { budget: 3, nightlife: 3, quiet: 3, safety: 3, transit: 4, food: 3, nature: 2 },
  { nightlife: 5, food: 4, transit: 3, budget: 3, quiet: 1, nature: 1, safety: 3 },
  { quiet: 5, nature: 4, transit: 3, food: 3, nightlife: 1, budget: 2, safety: 3 },
  { budget: 5, transit: 4, food: 3, nightlife: 3, quiet: 2, nature: 1, safety: 3 },
  { food: 5, transit: 4, nightlife: 3, quiet: 3, nature: 2, budget: 2, safety: 3 },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function dist(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Die Gegenden einer Stadt, die Reisende in der App am ehesten sehen */
export function areasOf(raw: RawCity, max = MAX_AREAS) {
  const out: { name: string; area: string; lat: number; lon: number; kind: "ecke" | "viertel" }[] = [];
  const add = (a: (typeof out)[number]) => {
    if (out.length >= max) return;
    // Ersatznamen der App („Rund um X“, „Gute Ecke“) taugen nicht für die Suche
    a = { ...a, name: a.name.replace(/^Rund um (die |den |das )?/i, "").trim() };
    if (!a.name || a.name.length < 3 || /^gute ecke$/i.test(a.name)) return;
    if (out.some((o) => norm(o.name) === norm(a.name) || dist(o, a) < 250)) return;
    out.push(a);
  };
  const c = raw.city;
  const spots: Spot[][] = PERSONAS.map((w) => findSpots(c.zones, w, c.places ?? [], c.step, 8));
  // Reihum aus allen Profilen, damit jedes Profil seine besten Ecken bekommt
  for (let i = 0; i < 8; i++) for (const list of spots) if (list[i]) add({ name: list[i].name, area: list[i].area, lat: list[i].lat, lon: list[i].lon, kind: "ecke" });
  for (const d of [...c.districts].sort((a, b) => a.distKm - b.distKm).slice(0, 12)) add({ name: d.name, area: "", lat: d.lat, lon: d.lon, kind: "viertel" });
  return out;
}

const SYSTEM = `Du recherchierst für die Reise-App StayCheck. Die App zeigt Reisenden, in welcher Gegend einer Stadt sie am besten übernachten.
Deine Aufgabe: herausfinden, was seriöse Reisequellen über eine bestimmte Gegend sagen, und das in Werte von 1 bis 10 übersetzen.

Suche gründlich (auf Englisch, Deutsch und in der Landessprache). Seriöse Quellen sind zum Beispiel: Wikivoyage, Lonely Planet, Rough Guides, Time Out, Fodor's, Frommer's, Condé Nast Traveler, Reiseteile großer Zeitungen, offizielle Tourismusseiten, Hostelworld-Stadtführer und bekannte Reiseblogs mit eigener Erfahrung vor Ort.
Nicht verwenden: Werbe- und SEO-Seiten ohne Autor, automatisch erzeugte Texte, Immobilien- und Hotelbuchungsseiten, Foren mit Einzelmeinungen.

Die Werte (1 = schlecht/wenig, 10 = sehr gut/sehr viel), aus Sicht von Reisenden, die dort übernachten:
- transit: Anbindung mit Bahn, Bus, zu Fuß zu den wichtigen Orten der Stadt
- nightlife: wie lebendig Bars, Clubs und Abendleben sind
- food: Auswahl und Qualität von Restaurants, Cafés, Streetfood
- nature: Parks, Grün, Wasser, Strand in der Nähe
- quiet: wie ruhig es nachts zum Schlafen ist (10 = sehr ruhig)
- budget: wie günstig man dort übernachten und essen kann (10 = sehr günstig)
- safety: wie sicher sich Reisende dort fühlen können (nur wenn Quellen das ausdrücklich beschreiben; sachlich, ohne Pauschalurteile über Menschen oder Gruppen)

Regeln:
- Gib einen Wert nur, wenn mindestens zwei unabhängige Quellen (verschiedene Websites) etwas dazu sagen. Sonst lass ihn weg.
- Ist die Gegend so klein oder unbekannt, dass seriöse Quellen nichts Genaues sagen, setze "found": false und lass "values" leer.
- Verwechsle die Gegend nicht mit gleichnamigen Orten anderswo.
- Schreib alles auf Deutsch, in eigenen Worten, kurz (je höchstens 140 Zeichen). Keine Zitate.
- In "sources" nur Adressen, die du in deinen Suchergebnissen wirklich gesehen hast.

Antworte am Ende nur mit JSON in genau diesem Format:
{"found": true, "summary": "1–2 Sätze, wie sich die Gegend anfühlt", "goodFor": ["…"], "watchOut": ["…"],
 "values": {"nightlife": {"v": 8, "why": "…", "src": [1, 3]}},
 "sources": [{"n": 1, "url": "https://…", "title": "…"}]}`;

type Block = { type: string; text?: string; content?: unknown };

async function callClaude(messages: { role: string; content: unknown }[]) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        messages,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      }),
      signal: AbortSignal.timeout(180_000),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e), headers: new Headers() }) as unknown as Response);
    if (res.ok) return res.json() as Promise<{ content: Block[]; stop_reason: string; usage: Record<string, unknown> }>;
    const body = await res.text();
    if (res.status === 401 || res.status === 403) throw new Error(`Schlüssel abgelehnt (${res.status}): ${body.slice(0, 200)}`);
    const wait = Number(res.headers.get("retry-after")) || 10 * (attempt + 1);
    console.log(`  Anfrage fehlgeschlagen (${res.status}), neuer Versuch in ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  throw new Error("Claude nicht erreichbar");
}

let spent = 0;
const cost = (u: Record<string, unknown>) => {
  const s = (u.server_tool_use as { web_search_requests?: number } | undefined)?.web_search_requests ?? 0;
  return (Number(u.input_tokens) || 0) * PRICE.in + (Number(u.output_tokens) || 0) * PRICE.out + s * PRICE.search;
};

const clean = (s: unknown, max = 140) => (typeof s === "string" ? s.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const urlKey = (u: string) => {
  try {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
};
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

async function research(area: ReturnType<typeof areasOf>[number], raw: RawCity): Promise<AreaInsight> {
  const ask = `Gegend: „${area.name}“${area.area && norm(area.area) !== norm(area.name) ? ` (Teil von ${area.area})` : ""} in ${raw.ort}, ${raw.land}. Mittelpunkt etwa ${area.lat.toFixed(4)}, ${area.lon.toFixed(4)}.
Was sagen seriöse Reisequellen über diese Gegend als Ort zum Übernachten?`;
  const messages: { role: string; content: unknown }[] = [{ role: "user", content: ask }];
  const seen = new Map<string, string>(); // urlKey → echte Adresse aus den Suchergebnissen
  let text = "";
  for (let turn = 0; turn < 4; turn++) {
    const r = await callClaude(messages);
    spent += cost(r.usage ?? {});
    for (const b of r.content) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const hit of b.content as { url?: string }[]) if (hit.url) seen.set(urlKey(hit.url), hit.url);
      }
      if (b.type === "text" && b.text) text += b.text;
    }
    if (r.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: r.content }); // lange Suche: weitermachen lassen
  }

  const base: AreaInsight = {
    name: area.name,
    kind: area.kind,
    lat: Number(area.lat.toFixed(5)),
    lon: Number(area.lon.toFixed(5)),
    checked: new Date().toISOString().slice(0, 10),
    found: false,
    summary: "",
    goodFor: [],
    watchOut: [],
    values: {},
    sources: [],
  };
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json);
  } catch {
    console.log(`  Antwort nicht lesbar: ${text.slice(0, 120)}`);
    return base;
  }

  // Nur Quellen, die wirklich in den Suchergebnissen standen
  const rawSources = Array.isArray(data.sources) ? (data.sources as { n?: number; url?: string; title?: string }[]) : [];
  const numToIdx = new Map<number, number>();
  for (const s of rawSources) {
    const real = s.url ? seen.get(urlKey(s.url)) : undefined;
    if (!real || typeof s.n !== "number") continue;
    if (!base.sources.some((x) => urlKey(x.url) === urlKey(real))) base.sources.push({ url: real, title: clean(s.title, 120) || host(real) });
    numToIdx.set(s.n, base.sources.findIndex((x) => urlKey(x.url) === urlKey(real)));
  }

  const values = (data.values ?? {}) as Record<string, { v?: number; why?: string; src?: number[] }>;
  for (const k of KEYS) {
    const val = values[k];
    if (!val || typeof val.v !== "number") continue;
    const src = [...new Set((val.src ?? []).map((n) => numToIdx.get(n)).filter((i): i is number => i !== undefined && i >= 0))];
    const domains = new Set(src.map((i) => host(base.sources[i].url)));
    if (domains.size < 2) continue; // mindestens zwei verschiedene Websites
    base.values[k] = { v: Math.max(1, Math.min(10, Math.round(val.v * 10) / 10)), why: clean(val.why), src };
  }
  base.found = Boolean(data.found) && Object.keys(base.values).length > 0;
  base.summary = base.found ? clean(data.summary, 240) : "";
  base.goodFor = base.found && Array.isArray(data.goodFor) ? (data.goodFor as unknown[]).map((x) => clean(x, 60)).filter(Boolean).slice(0, 4) : [];
  base.watchOut = base.found && Array.isArray(data.watchOut) ? (data.watchOut as unknown[]).map((x) => clean(x, 80)).filter(Boolean).slice(0, 3) : [];
  if (!base.found) base.sources = [];
  return base;
}

async function main() {
  if (process.env.DRY) {
    // Nur anzeigen, welche Gegenden recherchiert würden (kostet nichts)
    const index = JSON.parse(readFileSync("data/cities/index.json", "utf8")) as { slug: string }[];
    let n = 0;
    for (const c of index.filter((x) => !ONLY.length || ONLY.includes(x.slug))) {
      const raw = JSON.parse(gunzipSync(readFileSync(`data/cities/${c.slug}.json.gz`)).toString("utf8")) as RawCity;
      const a = areasOf(raw);
      n += a.length;
      console.log(`${raw.ort}: ${a.map((x) => `${x.name}${x.kind === "viertel" ? " (V)" : ""}`).join(", ")}`);
    }
    console.log(`Zusammen ${n} Gegenden`);
    return;
  }
  if (!KEY) {
    console.log("::error::ANTHROPIC_API_KEY fehlt. In GitHub unter Settings → Secrets and variables → Actions eintragen.");
    process.exit(1);
  }
  const index = JSON.parse(readFileSync("data/cities/index.json", "utf8")) as { slug: string }[];
  const cities = index.filter((c) => !ONLY.length || ONLY.includes(c.slug));
  mkdirSync("data/insights", { recursive: true });
  let stopped = false;

  for (const c of cities) {
    if (stopped) break;
    const raw = JSON.parse(gunzipSync(readFileSync(`data/cities/${c.slug}.json.gz`)).toString("utf8")) as RawCity;
    const file = `data/insights/${c.slug}.json`;
    const old: CityInsights | null = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
    const areas = areasOf(raw);
    const result: AreaInsight[] = [];
    console.log(`${raw.ort}: ${areas.length} Gegenden`);

    const queue = [...areas];
    async function worker() {
      for (;;) {
        const a = queue.shift();
        if (!a) return;
        const prev = old?.areas.find((x) => norm(x.name) === norm(a.name));
        if (prev && (Date.now() - Date.parse(prev.checked)) / 864e5 < FRESH_DAYS) {
          result.push(prev);
          continue;
        }
        if (spent >= MAX_USD) {
          stopped = true;
          if (prev) result.push(prev);
          continue;
        }
        try {
          const r = await research(a, raw);
          result.push(r);
          console.log(`  ${a.name}: ${r.found ? `${Object.keys(r.values).length} Werte, ${r.sources.length} Quellen` : "nichts Belastbares"} (bisher ${spent.toFixed(2)} $)`);
        } catch (e) {
          console.log(`  ${a.name}: Fehler ${(e as Error).message}`);
          if (/Schlüssel/.test((e as Error).message)) throw e;
          if (prev) result.push(prev);
        }
      }
    }
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    if (!result.length) continue;
    const out: CityInsights = { v: 1, slug: c.slug, generated: new Date().toISOString().slice(0, 10), model: MODEL, areas: result };
    writeFileSync(file, JSON.stringify(out, null, 1));
  }
  console.log(`Fertig. Kosten etwa ${spent.toFixed(2)} $${stopped ? ` (Kostenlimit ${MAX_USD} $ erreicht, Rest beim nächsten Lauf)` : ""}`);
  if (stopped) console.log(`::warning::Kostenlimit ${MAX_USD} $ erreicht, nicht alle Gegenden recherchiert.`);
}

main().catch((e) => {
  console.log(`::error::${(e as Error).message}`);
  process.exit(1);
});
