// Das Reise-Profil-Quiz: Szenen statt Skalen. Jede Antwort setzt Gewichte (0 = egal … 5 = unverzichtbar)
// und gibt eine kurze Rückmeldung, was sie bewirkt. „Ist mir egal“ lässt den Startwert stehen.
import type { IconName } from "@/lib/icons";
import type { TravelWith, Weights } from "@/lib/profile";

export type QuizAnswer = {
  text: string;
  sub: string;
  icon: IconName;
  set: Weights;
  hint: string;
  wer?: TravelWith;
  suggest?: "cafe"; // Extra, das wir für die letzte Frage schon vormerken
};
export type QuizQuestion = { key: string; question: string; layout: "grid" | "list"; answers: QuizAnswer[] };

/** Startwerte, falls jemand eine Frage überspringt */
export const BASE_WEIGHTS: Weights = { budget: 3, nightlife: 2, quiet: 3, safety: 3, transit: 3, food: 3, nature: 2 };

export const QUIZ: QuizQuestion[] = [
  {
    key: "wer",
    question: "Mit wem bist du unterwegs?",
    layout: "grid",
    answers: [
      { text: "Allein", sub: "Leute treffen", icon: "user", wer: "allein", set: { budget: 4, safety: 4 }, hint: "Günstige Betten und sichere Viertel zählen bei dir mehr." },
      { text: "Zu zweit", sub: "Pärchen-Trip", icon: "heart", wer: "paar", set: { quiet: 4, food: 4 }, hint: "Ruhige Ecken und gutes Essen zählen bei dir mehr." },
      { text: "Mit Freunden", sub: "Gruppe", icon: "users", wer: "freunde", set: { nightlife: 4, budget: 4 }, hint: "Ausgehen und günstige Betten zählen bei dir mehr." },
      {
        text: "Geschäftlich",
        sub: "oder Workation",
        icon: "briefcase",
        wer: "business",
        set: { transit: 5, quiet: 4 },
        suggest: "cafe",
        hint: "Gute Anbindung und Ruhe zählen mehr. Cafés haben wir vorgemerkt.",
      },
    ],
  },
  {
    key: "nightlife",
    question: "Es ist 23 Uhr. Wo bist du?",
    layout: "list",
    answers: [
      { text: "In einer Bar oder im Club", sub: "Die Nacht fängt gerade an", icon: "nightlife", set: { nightlife: 5 }, hint: "Nachteule! Wir suchen Viertel mit Leben." },
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
      { text: "Zu Fuß oder mit dem Rad", sub: "Ich will was sehen", icon: "walk", set: { transit: 2 }, hint: "Dir ist wichtiger, was direkt um die Ecke liegt." },
      { text: "Taxi oder Grab", sub: "Bequem ankommen", icon: "plane", set: { transit: 1 }, hint: "Die nächste Bahn ist dir nicht so wichtig." },
    ],
  },
  {
    key: "budget",
    question: "Was darf eine Nacht kosten?",
    layout: "list",
    answers: [
      { text: "Bis 30 €", sub: "Hostel, Schlafsaal, Pension", icon: "budget", set: { budget: 5 }, hint: "Viertel mit vielen Hostels zählen mehr." },
      { text: "30 bis 80 €", sub: "Einfaches Zimmer", icon: "hotel", set: { budget: 3 }, hint: "Preis zählt, aber nicht um jeden Preis." },
      { text: "Mehr ist okay", sub: "Lage geht vor", icon: "star", set: { budget: 1 }, hint: "Teurere Viertel sind für dich kein Problem." },
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
