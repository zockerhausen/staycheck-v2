// Das Reise-Profil-Quiz: Szenen statt Skalen. Jede Antwort setzt Gewichte (0 = egal … 5 = unverzichtbar)
// und gibt eine kurze Rückmeldung, was sie bewirkt. „Ist mir egal“ lässt den Startwert stehen.
import type { IconName } from "@/lib/icons";
import type { ExtraKey, TravelWith, Weights } from "@/lib/profile";

export type QuizAnswer = {
  text: string;
  sub: string;
  icon: IconName;
  set: Weights;
  hint: string;
  min?: Weights; // Gewicht mindestens so hoch (hebt an, senkt nie)
  wer?: TravelWith;
  suggest?: ExtraKey | ExtraKey[]; // Extras, die wir für die Laufweite-Frage schon vormerken
  must?: ExtraKey; // echtes Muss
  preis?: 1 | 2 | 3; // Budget pro Nacht (für den Budget-Filter bei Unterkünften)
  follow?: string; // Schlüssel einer Folgefrage (FOLLOW), die direkt danach kommt
};
export type QuizQuestion = { key: string; question: string; sub?: string; layout: "grid" | "list"; answers: QuizAnswer[] };

/** Startwerte, falls jemand eine Frage überspringt */
export const BASE_WEIGHTS: Weights = { budget: 3, nightlife: 2, quiet: 3, safety: 3, transit: 3, food: 3, nature: 2 };

export const QUIZ: QuizQuestion[] = [
  {
    key: "wer",
    question: "Mit wem bist du unterwegs?",
    layout: "grid",
    answers: [
      { text: "Allein", sub: "Leute treffen", icon: "user", wer: "allein", set: { budget: 4, safety: 4 }, follow: "allein", hint: "Günstige Betten und sichere Viertel zählen bei dir mehr." },
      { text: "Zu zweit", sub: "Pärchen-Trip", icon: "heart", wer: "paar", set: { quiet: 4, food: 4 }, hint: "Ruhige Ecken und gutes Essen zählen bei dir mehr." },
      { text: "Mit Freunden", sub: "Gruppe", icon: "users", wer: "freunde", set: { nightlife: 4, budget: 4 }, hint: "Ausgehen und günstige Betten zählen bei dir mehr." },
      {
        text: "Geschäftlich",
        sub: "oder Workation",
        icon: "briefcase",
        wer: "business",
        set: { transit: 5, quiet: 4 },
        follow: "arbeit",
        hint: "Gute Anbindung und Ruhe zählen mehr.",
      },
    ],
  },
  {
    key: "nightlife",
    question: "Es ist 23 Uhr. Wo bist du?",
    layout: "list",
    answers: [
      { text: "In einer Bar oder im Club", sub: "Die Nacht fängt gerade an", icon: "nightlife", set: { nightlife: 5 }, follow: "nacht", hint: "Nachteule! Wir suchen Viertel mit Leben." },
      { text: "Beim späten Abendessen", sub: "Gemütlich, nicht zu laut", icon: "food", set: { nightlife: 2, food: 4 }, hint: "Genießer:in. Gute Restaurants zählen mehr." },
      { text: "Schon im Bett", sub: "Morgen früh geht's los", icon: "quiet", set: { nightlife: 0 }, hint: "Früh ins Bett. Bars in der Nähe sind dir egal." },
    ],
  },
  {
    key: "nature",
    question: "Dein perfekter Morgen?",
    layout: "list",
    answers: [
      { text: "Eine Runde im Park", sub: "Laufen oder spazieren", icon: "nature", set: { nature: 5 }, hint: "Parks und Wasser in der Nähe zählen mehr." },
      { text: "Kaffee um die Ecke", sub: "Erst mal ankommen", icon: "cup", set: { nature: 2, food: 4 }, hint: "Cafés und Bäcker in Laufweite zählen mehr." },
      { text: "Ausschlafen", sub: "Urlaub ist Urlaub", icon: "quiet", set: { nature: 1, quiet: 4 }, hint: "Ausschlafen geht nur, wenn es ruhig ist." },
    ],
  },
  {
    key: "transit",
    question: "Wie kommst du durch die Stadt?",
    layout: "list",
    answers: [
      { text: "Mit Bahn und Metro", sub: "Schnell und günstig", icon: "transit", set: { transit: 5 }, hint: "Kurzer Weg zur nächsten Station zählt viel." },
      { text: "Zu Fuß oder mit dem Rad", sub: "Ich will was sehen", icon: "walk", set: { transit: 2 }, follow: "fuss", hint: "Dir ist wichtiger, was direkt um die Ecke liegt." },
      { text: "Taxi oder Grab", sub: "Bequem ankommen", icon: "plane", set: { transit: 1 }, hint: "Die nächste Bahn ist dir nicht so wichtig." },
    ],
  },
  {
    key: "budget",
    question: "Was darf eine Nacht kosten?",
    layout: "list",
    answers: [
      { text: "Bis 30 €", sub: "Hostel, Schlafsaal, Pension", icon: "budget", preis: 1, set: { budget: 5 }, hint: "Viertel mit vielen Hostels zählen mehr." },
      { text: "30 bis 80 €", sub: "Einfaches Zimmer", icon: "hotel", preis: 2, set: { budget: 3 }, hint: "Preis zählt, aber nicht um jeden Preis." },
      { text: "Mehr ist okay", sub: "Lage geht vor", icon: "star", preis: 3, set: { budget: 1 }, hint: "Teurere Viertel sind für dich kein Problem." },
    ],
  },
  {
    key: "quiet",
    question: "Wie schläfst du?",
    layout: "list",
    answers: [
      { text: "Überall, notfalls mit Ohrstöpseln", sub: "Nichts weckt mich", icon: "nightlife", set: { quiet: 1 }, hint: "Lärm vor der Tür ist für dich kein Problem." },
      { text: "Etwas Trubel ist okay", sub: "Nur nicht direkt an der Straße", icon: "walk", set: { quiet: 3 }, hint: "Große Straßen direkt vor der Tür zählen als Minus." },
      { text: "Ich brauche Stille", sub: "Jeder Bus weckt mich", icon: "quiet", set: { quiet: 5 }, hint: "Ruhe zählt bei dir richtig viel." },
    ],
  },
  {
    key: "safety",
    question: "Nachts allein zurück zur Unterkunft?",
    layout: "list",
    answers: [
      { text: "Da will ich mich sicher fühlen", sub: "Lieber kein Risiko", icon: "safety", set: { safety: 5 }, hint: "Sichere Viertel zählen bei dir viel." },
      { text: "Normal, ich pass auf mich auf", sub: "Wie zu Hause", icon: "walk", set: { safety: 3 }, hint: "Sicherheit zählt normal." },
      { text: "Ganz entspannt", sub: "Ich kenne mich aus", icon: "discover", set: { safety: 1 }, hint: "Sicherheit spielt für dich eine kleine Rolle." },
    ],
  },
  {
    key: "food",
    question: "Und das Essen?",
    layout: "list",
    answers: [
      { text: "Ich reise fürs Essen", sub: "Märkte, Streetfood, Restaurants", icon: "food", set: { food: 5 }, hint: "Foodie! Viele Lokale in Laufweite zählen viel." },
      { text: "Gutes Streetfood reicht", sub: "Hauptsache lecker", icon: "food", set: { food: 3 }, hint: "Essen zählt normal." },
      { text: "Hauptsache satt", sub: "Supermarkt tut's auch", icon: "cart", set: { food: 1 }, hint: "Restaurants in der Nähe sind dir nicht so wichtig." },
    ],
  },
];

/** Folgefragen: erscheinen nur nach einer bestimmten Antwort (siehe follow) */
export const FOLLOW: Record<string, QuizQuestion> = {
  allein: {
    key: "allein",
    question: "Allein unterwegs. Was ist dir wichtiger?",
    layout: "list",
    answers: [
      { text: "Leute kennenlernen", sub: "Hostels, Bars, Gemeinschaft", icon: "users", set: { nightlife: 4, budget: 5 }, hint: "Viertel mit vielen Hostels und Bars zählen mehr." },
      { text: "Meine Ruhe haben", sub: "Abends runterkommen", icon: "quiet", set: { quiet: 4 }, hint: "Ruhige Ecken zählen mehr." },
      { text: "Mich sicher fühlen", sub: "Auch spät noch zu Fuß", icon: "safety", set: { safety: 5 }, hint: "Sichere, belebte Viertel zählen viel." },
    ],
  },
  arbeit: {
    key: "arbeit",
    question: "Wo arbeitest du meistens?",
    layout: "list",
    answers: [
      { text: "Im Café", sub: "Laptop und Flat White", icon: "cup", set: {}, suggest: "cafe", hint: "Cafés in Laufweite haben wir vorgemerkt." },
      { text: "In der Unterkunft", sub: "Calls, Konzentration", icon: "quiet", set: { quiet: 5 }, hint: "Ruhe zählt bei dir richtig viel." },
      { text: "Termine in der Stadt", sub: "Viel unterwegs", icon: "transit", set: { transit: 5 }, hint: "Schnell überall hin: Anbindung zählt viel." },
    ],
  },
  nacht: {
    key: "nacht",
    question: "Und wo willst du schlafen?",
    layout: "list",
    answers: [
      { text: "Mittendrin", sub: "Kurzer Heimweg ist alles", icon: "nightlife", set: { nightlife: 5, quiet: 0 }, hint: "Mitten im Nachtleben. Lärm ist dir egal." },
      { text: "Ein paar Minuten weg", sub: "Feiern ja, schlafen in Ruhe", icon: "walk", set: { nightlife: 4, quiet: 4 }, hint: "Nah am Nachtleben, aber ruhiger zum Schlafen." },
    ],
  },
  fuss: {
    key: "fuss",
    question: "Was willst du zu Fuß erreichen?",
    layout: "list",
    answers: [
      { text: "Sehenswürdigkeiten", sub: "Morgens los, ohne Bahn", icon: "eye", set: {}, suggest: "sehenswert", hint: "Sehenswertes in Laufweite haben wir vorgemerkt." },
      { text: "Essen und Cafés", sub: "Immer was um die Ecke", icon: "food", set: {}, min: { food: 4 }, hint: "Viele Lokale in Laufweite zählen mehr." },
      { text: "Grün und Wasser", sub: "Einfach losspazieren", icon: "nature", set: {}, min: { nature: 4 }, hint: "Parks und Wasser in der Nähe zählen mehr." },
    ],
  },
};

/** Reise-Details: gelten für jede Stadt */
export const DETAILS: QuizQuestion[] = [
  {
    key: "dauer",
    question: "Wie lange bleibst du?",
    layout: "list",
    answers: [
      { text: "1 bis 3 Nächte", sub: "Kurz und knackig", icon: "bag", set: {}, min: { transit: 4 }, hint: "Wenig Zeit: zentral und gut angebunden zählt mehr." },
      { text: "Etwa eine Woche", sub: "Ganz normal", icon: "hotel", set: {}, hint: "Alles bleibt, wie du es gesagt hast." },
      { text: "Zwei Wochen oder länger", sub: "Fast wie wohnen", icon: "cart", set: {}, suggest: ["supermarkt", "waschsalon"], hint: "Länger da: Supermarkt und Waschsalon haben wir vorgemerkt." },
    ],
  },
  {
    key: "ankunft",
    question: "Wann kommst du an?",
    layout: "list",
    answers: [
      { text: "Tagsüber", sub: "Alles entspannt", icon: "star", set: {}, hint: "Alles klar." },
      { text: "Spät abends oder nachts", sub: "Müde mit Gepäck", icon: "plane", set: {}, min: { safety: 4, transit: 4 }, hint: "Späte Ankunft: sichere, gut erreichbare Lage zählt mehr." },
    ],
  },
];

/** Was wir über die Stadt wissen, um passende Fragen zu stellen (nur, wenn unsere Daten es hergeben) */
export type CityQuizInfo = { beach: boolean; sights: string[] };

/** Fragen nur für diese Stadt: Strand (wo es Strände in Laufweite gibt), Sehenswürdigkeiten (mit echten Namen) */
export function cityQuestions(cityName: string, info: CityQuizInfo | null): QuizQuestion[] {
  if (!info) return [];
  const out: QuizQuestion[] = [];
  if (info.beach) {
    out.push({
      key: "strand",
      question: `${cityName} hat Strände. Wie nah?`,
      layout: "list",
      answers: [
        { text: "Direkt am Strand", sub: "Morgens barfuß los", icon: "wave", set: {}, must: "strand", hint: "Strand ist bei dir ein Muss." },
        { text: "Wär schön", sub: "Aber kein Muss", icon: "wave", set: {}, suggest: "strand", hint: "Strand in Laufweite zählt mit." },
        { text: "Brauche ich nicht", sub: "Die Stadt reicht mir", icon: "map", set: {}, hint: "Strand spielt für dich keine Rolle." },
      ],
    });
  }
  if (info.sights.length >= 2) {
    const [a, b] = info.sights;
    out.push({
      key: "sights",
      question: `${a}, ${b} und Co.: wie nah?`,
      sub: `Die bekanntesten Orte in ${cityName}`,
      layout: "list",
      answers: [
        { text: "Zu Fuß erreichbar", sub: "Kurze Wege zu den Highlights", icon: "eye", set: {}, suggest: "sehenswert", hint: "Sehenswertes in Laufweite zählt mit." },
        { text: "Lieber etwas abseits", sub: "Weniger Touristen", icon: "walk", set: {}, min: { quiet: 4 }, hint: "Etwas ruhiger, abseits der Touristenströme." },
      ],
    });
  }
  return out;
}

/** Gewichte nach einer Antwort: set überschreibt, min hebt nur an */
export function applyAnswer(w: Weights, a: QuizAnswer): Weights {
  const next = { ...w, ...a.set };
  for (const [k, v] of Object.entries(a.min ?? {})) next[k] = Math.max(next[k] ?? 0, v);
  return next;
}
