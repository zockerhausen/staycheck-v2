// Fragen fürs Quiz. Jede Antwort setzt ein Gewicht von 0 (egal) bis 5 (unverzichtbar).
export type QuizAnswer = { text: string; weight: number };
export type QuizQuestion = { key: string; question: string; answers: QuizAnswer[] };

export const QUIZ: QuizQuestion[] = [
  {
    key: "budget",
    question: "Wie sieht dein Reisebudget aus?",
    answers: [
      { text: "Jeder Euro zählt", weight: 5 },
      { text: "Backpacker-Budget, aber ok", weight: 3 },
      { text: "Geld ist nicht das Thema", weight: 0 },
    ],
  },
  {
    key: "nightlife",
    question: "Wie sehen deine Nächte aus?",
    answers: [
      { text: "Feiern bis Sonnenaufgang", weight: 5 },
      { text: "Ein paar Bars, dann ins Bett", weight: 3 },
      { text: "Ich schlafe lieber", weight: 0 },
    ],
  },
  {
    key: "quiet",
    question: "Wie ruhig soll es um dich herum sein?",
    answers: [
      { text: "Ich brauche Ruhe zum Schlafen", weight: 5 },
      { text: "Etwas Trubel ist okay", weight: 2 },
      { text: "Je lebendiger, desto besser", weight: 0 },
    ],
  },
  {
    key: "safety",
    question: "Wie wichtig ist dir Sicherheit, auch nachts?",
    answers: [
      { text: "Sehr wichtig, ich will mich entspannt fühlen", weight: 5 },
      { text: "Normal, ich pass auf mich auf", weight: 3 },
      { text: "Ich bin da ziemlich entspannt", weight: 1 },
    ],
  },
  {
    key: "transit",
    question: "Wie bewegst du dich durch die Stadt?",
    answers: [
      { text: "Nur mit U- und S-Bahn", weight: 5 },
      { text: "Mal Bahn, mal Fahrrad", weight: 3 },
      { text: "Ich laufe alles zu Fuß", weight: 1 },
    ],
  },
  {
    key: "food",
    question: "Wie wichtig ist dir gutes Essen?",
    answers: [
      { text: "Ich reise für das Essen", weight: 5 },
      { text: "Ein guter Döner reicht", weight: 3 },
      { text: "Hauptsache satt", weight: 0 },
    ],
  },
  {
    key: "nature",
    question: "Brauchst du Grün und Wasser in der Nähe?",
    answers: [
      { text: "Ja, Parks und Spree sind Pflicht", weight: 5 },
      { text: "Wäre schön", weight: 3 },
      { text: "Ich bin Stadtkind", weight: 0 },
    ],
  },
];
