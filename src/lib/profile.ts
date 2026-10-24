// Erweitertes Reise-Profil: mit wem man reist, Extras in Laufweite, ein echtes Muss, Reise-Typ.
// Läuft im Browser und auf dem Server (keine Server-Importe hier).
import type { IconName } from "@/lib/icons";

export type Weights = Record<string, number>;
export type TravelWith = "allein" | "paar" | "freunde" | "business";
export type ExtraKey = "supermarkt" | "waschsalon" | "cafe" | "strand" | "fitness" | "sehenswert";
export type Extras = { wer: TravelWith | null; items: ExtraKey[]; must: ExtraKey | null };

export const NO_EXTRAS: Extras = { wer: null, items: [], must: null };

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
  return [`w=${e.wer ?? ""}`, `x=${e.items.join(".")}`, `m=${e.must ?? ""}`].join(";");
}

export function cleanExtras(input: { wer?: unknown; items?: unknown; must?: unknown } | null | undefined): Extras {
  const wer = typeof input?.wer === "string" && WER.has(input.wer) ? (input.wer as TravelWith) : null;
  const items = Array.isArray(input?.items)
    ? ([...new Set(input.items.filter((x): x is string => typeof x === "string" && EXTRA_KEYS.has(x)))] as ExtraKey[])
    : [];
  const must = typeof input?.must === "string" && EXTRA_KEYS.has(input.must) ? (input.must as ExtraKey) : null;
  if (must && !items.includes(must)) items.push(must);
  return { wer, items: items.slice(0, 6), must };
}

export function decodeExtras(raw: string | undefined): Extras {
  if (!raw) return NO_EXTRAS;
  const parts = Object.fromEntries(
    raw
      .slice(0, 200)
      .split(";")
      .map((p) => p.split("=") as [string, string]),
  );
  return cleanExtras({ wer: parts.w, items: (parts.x ?? "").split(".").filter(Boolean), must: parts.m });
}

/** Gewichte inklusive Extras (für den persönlichen Match). */
export function fullWeights(weights: Weights, extras: Extras): Weights {
  const w: Weights = { ...weights };
  for (const k of extras.items) w[k] = k === extras.must ? MUST_WEIGHT : EXTRA_WEIGHT;
  return w;
}

/** Durchschnitt der Werte, gewichtet. Werte ohne Daten (null) zählen nicht. */
export function weightedMatch(scores: Record<string, number | null | undefined>, weights: Weights) {
  let sum = 0;
  let max = 0;
  for (const [k, w] of Object.entries(weights)) {
    const s = scores[k];
    if (w <= 0 || s === null || s === undefined) continue;
    sum += w * s;
    max += w * 10;
  }
  return max ? Math.round((sum / max) * 100) : 0;
}

export type PersonalMatch = { match: number; uncapped: number; mustMissing: ExtraKey | null };

/** Persönlicher Match: gewichteter Durchschnitt, aber ein fehlendes Muss begrenzt ihn hart. */
export function personalMatch(scores: Record<string, number | null | undefined>, weights: Weights, extras: Extras): PersonalMatch {
  const uncapped = weightedMatch(scores, fullWeights(weights, extras));
  const m = extras.must;
  const mustMissing = m && scores[m] !== null && scores[m] !== undefined && (scores[m] as number) <= 3 ? m : null;
  return { match: mustMissing ? Math.min(uncapped, MUST_CAP) : uncapped, uncapped, mustMissing };
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
  // Zusatz: Extra-Muss, sonst Extras, sonst Reisebegleitung
  const extraMod: Partial<Record<ExtraKey, string>> = {
    cafe: "mit Laptop",
    strand: "mit Strandtuch",
    fitness: "mit Sportschuhen",
    sehenswert: "mit Kamera",
    supermarkt: "mit Selbstversorger-Plan",
    waschsalon: "auf Langzeit-Tour",
  };
  const werMod: Record<TravelWith, string> = { allein: "auf Solo-Tour", paar: "zu zweit", freunde: "mit Crew", business: "auf Geschäftsreise" };
  const first = extras.must ?? extras.items[0];
  const mod = (first && extraMod[first]) || (extras.wer ? werMod[extras.wer] : "");
  // Zweiter Satzteil: was sonst noch zählt
  const also: string[] = [];
  if (main.name !== "Sparfuchs" && w("budget") >= 4) also.push("nicht viel zahlen");
  if (main.name !== "Ruhesucher:in" && w("quiet") >= 4) also.push("ruhig schlafen");
  if (extras.items.includes("cafe")) also.push("tagsüber arbeiten");
  if (main.name !== "Stadtentdecker:in" && w("transit") >= 4) also.push("schnell mit der Bahn los");
  const text = `${main.text}${also.length ? ` und willst ${also.slice(0, 2).join(" und ")}` : ""}.`;
  return { name: mod ? `${main.name} ${mod}` : main.name, text, icon: main.icon };
}
