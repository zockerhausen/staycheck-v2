// „So fühlt es sich an“: Tagesablauf und für wen eine Gegend passt – fest aus den Werten (1–10) abgeleitet.
// Keine erfundenen Details: jeder Satz folgt aus einer Schwelle, die man unter „So rechnen wir“ nachlesen kann.
import type { IconName } from "@/lib/icons";

type Scores = Record<string, number | null | undefined>;
const v = (s: Scores, k: string) => (typeof s[k] === "number" ? (s[k] as number) : null);

export type Moment = { key: string; label: string; icon: IconName; text: string };

export function dayProfile(s: Scores): Moment[] {
  const food = v(s, "food");
  const night = v(s, "nightlife");
  const quiet = v(s, "quiet");
  const transit = v(s, "transit");
  const nature = v(s, "nature");
  const out: Moment[] = [];

  if (food !== null) {
    let t =
      food >= 8
        ? "Cafés und Bäcker gibt es viele in Laufweite, Frühstück ist einfach."
        : food >= 5
          ? "Ein paar Cafés liegen in der Nähe."
          : "Zum Frühstück eher in der Unterkunft essen oder ein Stück laufen.";
    if (nature !== null && nature >= 7) t += " Ein Park zum Laufen oder Spazieren ist nah.";
    out.push({ key: "morgens", label: "Morgens", icon: "cup", text: t });
  }
  if (transit !== null) {
    out.push({
      key: "tags",
      label: "Tagsüber",
      icon: "transit",
      text:
        transit >= 8
          ? "Die nächste Bahn ist wenige Minuten entfernt, der Rest der Stadt ist schnell erreichbar."
          : transit >= 5
            ? "Eine Bahn ist erreichbar, aber nicht direkt vor der Tür."
            : "Keine Bahn in der Nähe: Bus, Taxi oder Rad einplanen.",
    });
  }
  if (food !== null || night !== null) {
    const f = food ?? 0;
    const n = night ?? 0;
    out.push({
      key: "abends",
      label: "Abends",
      icon: "food",
      text:
        f >= 8 && n >= 7
          ? "Restaurants und Bars liegen direkt um die Ecke, abends ist hier viel los."
          : f >= 8
            ? "Gute Auswahl zum Essen gehen, Bars gibt es eher wenige."
            : n >= 7
              ? "Bars in der Nähe, zum Essen lohnt sich ein kurzer Weg."
              : "Abends eher ruhig. Zum Ausgehen fährt man in eine andere Gegend.",
    });
  }
  if (quiet !== null || night !== null) {
    const q = quiet ?? 5;
    const n = night ?? 0;
    out.push({
      key: "nachts",
      label: "Nachts",
      icon: "quiet",
      text:
        q <= 3 || n >= 9
          ? "Bis spät belebt. Wer leicht schläft, nimmt ein Zimmer zum Hof oder Ohrstöpsel mit."
          : q <= 5
            ? "Etwas Trubel, an Hauptstraßen kann es laut werden."
            : "Nachts ruhig, gute Chancen auf durchgeschlafene Nächte.",
    });
  }
  return out;
}

export type Fit = { label: string; icon: IconName };

/** Für wen die Gegend gut passt – und für wen eher nicht. */
export function fitsFor(s: Scores): { good: Fit[]; bad: Fit[] } {
  const food = v(s, "food") ?? 0;
  const night = v(s, "nightlife") ?? 0;
  const quiet = v(s, "quiet");
  const transit = v(s, "transit");
  const nature = v(s, "nature") ?? 0;
  const budget = v(s, "budget");
  const good: Fit[] = [];
  const bad: Fit[] = [];
  if (night >= 8) good.push({ label: "Nachtschwärmer", icon: "nightlife" });
  if (food >= 9) good.push({ label: "Foodies", icon: "food" });
  if (quiet !== null && quiet >= 7) good.push({ label: "Leichter Schlaf", icon: "quiet" });
  if (transit !== null && transit >= 9) good.push({ label: "Viel sehen in kurzer Zeit", icon: "transit" });
  if (budget !== null && budget >= 7) good.push({ label: "Kleines Budget", icon: "budget" });
  if (nature >= 7) good.push({ label: "Läufer und Natur-Fans", icon: "nature" });
  if (food >= 7 && quiet !== null && quiet >= 5 && transit !== null && transit >= 7) good.push({ label: "Workation", icon: "briefcase" });

  if (quiet !== null && quiet <= 3) bad.push({ label: "Leichter Schlaf", icon: "quiet" });
  if (night <= 3) bad.push({ label: "Nachtschwärmer", icon: "nightlife" });
  if (transit !== null && transit <= 4) bad.push({ label: "Ohne Bahn unterwegs", icon: "transit" });
  if (budget !== null && budget <= 3) bad.push({ label: "Kleines Budget", icon: "budget" });
  return { good: good.slice(0, 4), bad: bad.slice(0, 3) };
}
