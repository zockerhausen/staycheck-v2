// Erweitertes Reise-Profil: mit wem man reist, Extras in Laufweite, ein echtes Muss, Reise-Typ.
// Läuft im Browser und auf dem Server (keine Server-Importe hier).
import type { IconName } from "@/lib/icons";

export type Weights = Record<string, number>;
export type TravelWith = "allein" | "paar" | "freunde" | "business";
export type ExtraKey = "supermarkt" | "waschsalon" | "cafe" | "strand" | "fitness" | "sehenswert";
export type PriceBand = 1 | 2 | 3; // 1 = bis ca. 30 €, 2 = 30–80 €, 3 = mehr ist okay
export type NoGo = "partymeile" | "laut" | "abgelegen" | "unsicher";
export type Extras = { wer: TravelWith | null; items: ExtraKey[]; must: ExtraKey | null; preis?: PriceBand | null; nogo?: NoGo[] };

export const NO_EXTRAS: Extras = { wer: null, items: [], must: null, preis: null, nogo: [] };

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

/**
 * No-Gos: Ecken, die für jemanden gar nicht gehen. Trifft eins zu, ist der Match höchstens NOGO_CAP.
 * Die Grenzen sind feste Werte unserer Skalen (gleich in jeder Stadt). Fehlen Daten, schließen wir nichts aus.
 */
export const NOGOS: { key: NoGo; label: string; sub: string; icon: IconName; hit: (s: Record<string, number | null | undefined>) => boolean }[] = [
  { key: "partymeile", label: "Partymeile vor der Tür", sub: "Ausgehen 8,5 von 10 oder mehr", icon: "nightlife", hit: (s) => num(s.nightlife) >= 8.5 },
  { key: "laut", label: "Laut die ganze Nacht", sub: "Ruhe 2,5 von 10 oder weniger", icon: "bus", hit: (s) => num(s.quiet) <= 2.5 },
  { key: "abgelegen", label: "Weit draußen", sub: "kaum Bahn und wenig Essen in der Nähe", icon: "map", hit: (s) => num(s.transit) <= 2.5 && num(s.food) <= 4 },
  { key: "unsicher", label: "Unsichere Gegend", sub: "Sicherheit 4 von 10 oder weniger", icon: "safety", hit: (s) => num(s.safety) <= 4 },
];
export const NOGO_LABEL: Record<string, string> = Object.fromEntries(NOGOS.map((n) => [n.key, n.label]));
const NOGO_KEYS = new Set<string>(NOGOS.map((n) => n.key));
export const NOGO_CAP = 45;

/** Erstes No-Go, das an dieser Stelle zutrifft (oder null) */
export function nogoHit(scores: Record<string, number | null | undefined>, nogo: NoGo[] | undefined): NoGo | null {
  if (!nogo?.length) return null;
  return NOGOS.find((n) => nogo.includes(n.key) && n.hit(scores))?.key ?? null;
}

/** Match für Viertel, Ecken und Rasterpunkte: gewichtet, ein No-Go deckelt ihn */
export function profileMatch(scores: Record<string, number | null | undefined>, weights: Weights, nogo?: NoGo[]) {
  const m = weightedMatch(scores, weights);
  return nogoHit(scores, nogo) ? Math.min(m, NOGO_CAP) : m;
}

export const EXTRAS: { key: ExtraKey; label: string; icon: IconName }[] = [
  { key: "supermarkt", label: "Supermarkt", icon: "cart" },
  { key: "cafe", label: "Cafés", icon: "cup" },
  { key: "sehenswert", label: "Sehenswertes", icon: "eye" },
  { key: "waschsalon", label: "Waschsalon", icon: "wash" },
  { key: "fitness", label: "Fitnessstudio", icon: "gym" },
  { key: "strand", label: "Strand", icon: "wave" },
];
export const EXTRA_LABEL: Record<string, string> = Object.fromEntries(EXTRAS.map((e) => [e.key, e.label]));
const EXTRA_KEYS = new Set<string>(EXTRAS.map((e) => e.key));
const WER = new Set<string>(["allein", "paar", "freunde", "business"]);

// Gewicht der Extras im Match: gewählt = 3 (wichtig), Muss = 5 (unverzichtbar)
export const EXTRA_WEIGHT = 3;
export const MUST_WEIGHT = 5;
// Fehlt das Muss (Wert 3 oder weniger, also nicht in ~8 Min. zu Fuß), ist der Match höchstens so hoch:
export const MUST_CAP = 60;

/** Cookie-Format: "w=allein;x=cafe.supermarkt;m=cafe" – alles wird beim Lesen streng geprüft. */
export function encodeExtras(e: Extras) {
  return [`w=${e.wer ?? ""}`, `x=${e.items.join(".")}`, `m=${e.must ?? ""}`, `p=${e.preis ?? ""}`, `n=${(e.nogo ?? []).join(".")}`].join(";");
}

export function cleanExtras(input: { wer?: unknown; items?: unknown; must?: unknown; preis?: unknown; nogo?: unknown } | null | undefined): Extras {
  const wer = typeof input?.wer === "string" && WER.has(input.wer) ? (input.wer as TravelWith) : null;
  const items = Array.isArray(input?.items)
    ? ([...new Set(input.items.filter((x): x is string => typeof x === "string" && EXTRA_KEYS.has(x)))] as ExtraKey[])
    : [];
  const must = typeof input?.must === "string" && EXTRA_KEYS.has(input.must) ? (input.must as ExtraKey) : null;
  if (must && !items.includes(must)) items.push(must);
  const p = Number(input?.preis);
  const preis = p === 1 || p === 2 || p === 3 ? (p as PriceBand) : null;
  const nogo = Array.isArray(input?.nogo)
    ? ([...new Set(input.nogo.filter((x): x is string => typeof x === "string" && NOGO_KEYS.has(x)))] as NoGo[])
    : [];
  return { wer, items: items.slice(0, 6), must, preis, nogo };
}

export function decodeExtras(raw: string | undefined): Extras {
  if (!raw) return NO_EXTRAS;
  const parts = Object.fromEntries(
    raw
      .slice(0, 200)
      .split(";")
      .map((p) => p.split("=") as [string, string]),
  );
  return cleanExtras({
    wer: parts.w,
    items: (parts.x ?? "").split(".").filter(Boolean),
    must: parts.m,
    preis: parts.p,
    nogo: (parts.n ?? "").split(".").filter(Boolean),
  });
}

/** Gewichte inklusive Extras (für den persönlichen Match). */
export function fullWeights(weights: Weights, extras: Extras): Weights {
  const w: Weights = { ...weights };
  for (const k of extras.items) w[k] = k === extras.must ? MUST_WEIGHT : EXTRA_WEIGHT;
  return w;
}

/**
 * Match in Prozent (0–100) aus den Werten (0–10) und den Gewichten (0 = egal … 5 = sehr wichtig).
 * - Gewichte zählen im Quadrat: „sehr wichtig“ (5) zählt 25-fach, „wenig wichtig“ (1) einfach.
 *   So entscheidet, was dir wirklich wichtig ist, und nicht der Durchschnitt aus allem.
 * - Schwächen zählen etwas stärker als Stärken (Mittel über Wurzeln): ein schwacher Wert bei etwas Wichtigem
 *   lässt sich nicht durch viele mittlere Werte ausgleichen. Sind alle Werte gleich, kommt genau dieser Wert heraus.
 * Werte ohne Daten (null) zählen nicht.
 */
export function weightedMatch(scores: Record<string, number | null | undefined>, weights: Weights) {
  let sum = 0;
  let total = 0;
  for (const [k, w] of Object.entries(weights)) {
    const s = scores[k];
    if (!(w > 0) || s === null || s === undefined || !Number.isFinite(s)) continue;
    const weight = w * w;
    sum += weight * Math.sqrt(Math.min(10, Math.max(0, s)) / 10);
    total += weight;
  }
  return total ? Math.round((sum / total) ** 2 * 100) : 0;
}

export type PersonalMatch = { match: number; uncapped: number; mustMissing: ExtraKey | null; nogo: NoGo | null };

/** Persönlicher Match: gewichteter Durchschnitt, aber ein fehlendes Muss oder ein No-Go begrenzt ihn hart. */
/**
 * nogoBasis: Werte, an denen No-Gos geprüft werden. Für Unterkünfte und Adressen die Rasterwerte der Stelle
 * (gleiche Skala wie Ecken und Karte), damit eine empfohlene Ecke nicht lauter „No-Go“-Unterkünfte hat.
 */
export function personalMatch(
  scores: Record<string, number | null | undefined>,
  weights: Weights,
  extras: Extras,
  nogoBasis?: Record<string, number | null | undefined> | null,
): PersonalMatch {
  const uncapped = weightedMatch(scores, fullWeights(weights, extras));
  const m = extras.must;
  const mustMissing = m && scores[m] !== null && scores[m] !== undefined && (scores[m] as number) <= 3 ? m : null;
  const nogo = nogoHit(nogoBasis ?? scores, extras.nogo);
  let match = uncapped;
  if (mustMissing) match = Math.min(match, MUST_CAP);
  if (nogo) match = Math.min(match, NOGO_CAP);
  return { match, uncapped, mustMissing, nogo };
}

// ---------- Reise-Typ ----------

export type Persona = { name: string; text: string; icon: IconName };

export function persona(weights: Weights, extras: Extras): Persona {
  const w = (k: string) => weights[k] ?? 0;
  // Hauptwort: stärkster Zug
  const mains: { ok: boolean; name: string; text: string; icon: IconName; score: number }[] = [
    { ok: w("nightlife") >= 4, name: "Nachteule", text: "Du willst abends raus", icon: "nightlife", score: w("nightlife") + 0.3 },
    { ok: w("food") >= 5, name: "Foodie", text: "Du reist fürs Essen", icon: "food", score: w("food") },
    { ok: w("nature") >= 4, name: "Naturkind", text: "Du brauchst Grün und Wasser", icon: "nature", score: w("nature") },
    { ok: w("quiet") >= 4 && w("nightlife") <= 2, name: "Ruhesucher:in", text: "Du willst gut schlafen", icon: "quiet", score: w("quiet") },
    { ok: w("transit") >= 5, name: "Stadtentdecker:in", text: "Du willst schnell überall hin", icon: "transit", score: w("transit") - 0.2 },
    { ok: w("budget") >= 5, name: "Sparfuchs", text: "Du willst wenig zahlen", icon: "budget", score: w("budget") - 0.3 },
    { ok: w("safety") >= 5, name: "Auf-Nummer-sicher-Typ", text: "Du willst dich sicher fühlen", icon: "safety", score: w("safety") - 0.5 },
  ];
  const main = mains.filter((m) => m.ok).sort((a, b) => b.score - a.score)[0] ?? {
    name: "Allrounder",
    text: "Dir ist eine gute Mischung wichtig",
    icon: "discover" as IconName,
  };
  // Zusatz: ein markantes Extra, sonst die Reisebegleitung
  const extraMod: Partial<Record<ExtraKey, string>> = {
    cafe: "mit Laptop",
    strand: "mit Strandtuch",
    fitness: "mit Sportschuhen",
    sehenswert: "mit Kamera",
  };
  const werMod: Record<TravelWith, string> = { allein: "auf Solo-Tour", paar: "zu zweit", freunde: "mit Crew", business: "auf Geschäftsreise" };
  const ordered = [extras.must, ...extras.items].filter((k): k is ExtraKey => Boolean(k && extraMod[k]));
  const mod = (ordered[0] && extraMod[ordered[0]]) || (extras.wer ? werMod[extras.wer] : "");
  // Was sonst noch zählt, als kurze Satzteile
  const also: string[] = [];
  if (main.name !== "Sparfuchs" && w("budget") >= 4) also.push("zahlst nicht gern viel");
  if (main.name !== "Ruhesucher:in" && w("quiet") >= 4) also.push("schläfst gern ruhig");
  if (extras.items.includes("cafe")) also.push("arbeitest tagsüber gern im Café");
  if (main.name !== "Stadtentdecker:in" && w("transit") >= 4) also.push("bist gern schnell mit der Bahn unterwegs");
  const parts = also.slice(0, 2);
  const text = parts.length === 0 ? `${main.text}.` : parts.length === 1 ? `${main.text} und ${parts[0]}.` : `${main.text}, ${parts[0]} und ${parts[1]}.`;
  return { name: mod ? `${main.name} ${mod}` : main.name, text, icon: main.icon };
}
