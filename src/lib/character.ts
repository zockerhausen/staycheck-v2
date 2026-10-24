// Charakter eines Viertels: Eigenschaften, die direkt aus den Viertel-Werten (1–10) folgen.
// Bewusst einfache, feste Schwellen, damit jede Eigenschaft nachvollziehbar ist.
import type { IconName } from "@/lib/icons";

export type TraitKey = "feiern" | "essen" | "ruhig" | "gruen" | "guenstig" | "zentral";
export type Trait = { key: TraitKey; label: string; icon: IconName; criterion: string; min: number };

export const TRAITS: Trait[] = [
  { key: "feiern", label: "Feiern", icon: "nightlife", criterion: "nightlife", min: 8 },
  { key: "essen", label: "Gutes Essen", icon: "food", criterion: "food", min: 9 },
  { key: "ruhig", label: "Ruhig", icon: "quiet", criterion: "quiet", min: 7 },
  { key: "gruen", label: "Grün", icon: "nature", criterion: "nature", min: 7 },
  { key: "guenstig", label: "Günstig", icon: "budget", criterion: "budget", min: 7 },
  { key: "zentral", label: "Top angebunden", icon: "transit", criterion: "transit", min: 9 },
];

// Überschrift je nach stärkster Eigenschaft
const TYPE: Record<TraitKey, string> = {
  feiern: "Zum Ausgehen",
  essen: "Für Foodies",
  ruhig: "Zum Durchschlafen",
  gruen: "Grün und entspannt",
  guenstig: "Für kleines Budget",
  zentral: "Mittendrin",
};

type Scores = Record<string, number | null>;

/**
 * Eigenschaften eines Viertels, stärkste zuerst.
 * Mit pool (alle Viertel der Stadt) zählt eine Eigenschaft nur, wenn höchstens die Hälfte der Viertel
 * mindestens genauso gut ist. Was in einer Stadt überall gilt (z. B. „Gutes Essen“ in Barcelona),
 * ist dort keine Besonderheit – so unterscheiden sich die Viertel auch in sehr dichten Städten.
 */
export function traitsOf(scores: Scores, pool?: Scores[]): Trait[] {
  return TRAITS.filter((t) => {
    const v = scores[t.criterion] ?? 0;
    if (v < t.min) return false;
    if (!pool || pool.length < 4) return true;
    const asGood = pool.filter((p) => (p[t.criterion] ?? 0) >= v).length;
    return asGood / pool.length <= 0.5;
  }).sort((a, b) => (scores[b.criterion] ?? 0) - b.min - ((scores[a.criterion] ?? 0) - a.min));
}

/** Kurzer Typ für die Karte, z. B. „Zum Ausgehen“. */
export function characterOf(scores: Scores, pool?: Scores[]): string {
  const [first] = traitsOf(scores, pool);
  return first ? TYPE[first.key] : "Allrounder";
}

/** Dezenter Farbverlauf je Typ (dunkel, damit es ruhig bleibt). */
export function characterTint(scores: Scores, pool?: Scores[]): string {
  const key = traitsOf(scores, pool)[0]?.key;
  const tints: Record<TraitKey, string> = {
    feiern: "#4a1f10",
    essen: "#43260f",
    ruhig: "#18243a",
    gruen: "#15301f",
    guenstig: "#2c2f12",
    zentral: "#331a3a",
  };
  return key ? tints[key] : "#26262a";
}
