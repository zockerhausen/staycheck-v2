import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
import type { IconName } from "@/lib/icons";

export const metadata: Metadata = { title: "So rechnen wir – StayCheck" };

// Klartext zu src/lib/score.ts – bei Änderungen an der Formel bitte hier mitändern.
const RULES: { icon: IconName; title: string; how: string; scale: string }[] = [
  {
    icon: "transit",
    title: "Anbindung",
    how: "Fußweg zum nächsten Bahnhof (S-/U-Bahn, Zug, Metro, Skytrain) im Umkreis von 900 m. Straßenbahn und Boote zählen weniger, weil sie seltener und langsamer fahren. Bus nur als Notlösung.",
    scale: "Bahn: bis 3 Min. = 10 · bis 5 Min. = 9 · bis 7 Min. = 8 · bis 9 Min. = 7 · bis 12 Min. = 5 · Straßenbahn höchstens 7 · Boot höchstens 6 · nur Bus = 3 · nichts = 1",
  },
  {
    icon: "nightlife",
    title: "Nachtleben",
    how: "Bars, Kneipen und Biergärten im Umkreis von 600 m. Ein Club zählt wie zwei Bars.",
    scale: "0 = 1 · bis 2 = 3 · bis 5 = 5 · bis 10 = 7 · bis 20 = 9 · mehr = 10",
  },
  {
    icon: "food",
    title: "Essen",
    how: "Restaurants, Cafés und Imbisse im Umkreis von 500 m.",
    scale: "0 = 1 · bis 3 = 3 · bis 8 = 5 · bis 15 = 7 · bis 30 = 9 · mehr = 10",
  },
  {
    icon: "nature",
    title: "Grün & Wasser",
    how: "Abstand zum Rand des nächsten Parks, Waldes, Sees, Flusses oder Strands (nicht zur Mitte, große Parks zählen also richtig). Mini-Flächen unter 0,5 ha zählen nicht. Volle Punkte gibt es nur für große Parks oder Wasser ab 5 ha.",
    scale: "Großer Park: bis 150 m = 10 · bis 300 m = 9 · bis 450 m = 8 · bis 600 m = 7 · bis 800 m = 6 · Kleine Grünfläche höchstens 7 · nichts in 800 m = 2",
  },
  {
    icon: "quiet",
    title: "Ruhe",
    how: "Wir starten bei 10 und ziehen für Lärmquellen ab, je näher, desto mehr: Bars in 250 m, Clubs in 300 m, große Straßen in 120 m, belebte Straße direkt vor der Tür, Bahngleise über der Erde in 150 m, sehr viele Restaurants.",
    scale: "Hauptstraße bis 25 m: −3,5 · bis 60 m: −2,5 · bis 120 m: −1 · Gleise bis 60 m: −2 · Club direkt nebenan: bis −2 · Bar direkt nebenan: bis −0,7",
  },
  {
    icon: "safety",
    title: "Sicherheit",
    how: "OpenStreetMap kennt keine Sicherheit. Wir nutzen unsere Einschätzung für das ganze Viertel (aus öffentlichen Berichten und Reiseerfahrungen), nicht für die einzelne Straße. Wo wir keine Einschätzung haben, fließt Sicherheit nicht in den Score ein.",
    scale: "Nur in Städten mit Viertel-Bewertung (Berlin, Bangkok)",
  },
  {
    icon: "budget",
    title: "Günstig",
    how: "Preisniveau des Viertels (unsere Einschätzung, zählt doppelt) plus die Zahl der Hostels und Pensionen im Umkreis von 800 m. Echte Preise siehst du beim Buchungsportal.",
    scale: "Ohne Viertel-Bewertung nur nach Hostels und Pensionen",
  },
];

export default function MethodePage() {
  return (
    <div className="fade-up">
      <div className="flex items-center justify-between">
        <Link href="/check" aria-label="Zurück" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
          <Icon name="back" size={18} />
        </Link>
        <span className="text-base font-bold">So rechnen wir</span>
        <span className="h-11 w-11" />
      </div>

      <h1 className="mega mt-6 text-[2.1rem]">Ehrlich gerechnet.</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Du sollst verstehen, warum eine Unterkunft gut oder schlecht abschneidet. Darum zeigen wir zu jedem Wert die Fakten dahinter. Niemand kann sich
        einen besseren Score kaufen.
      </p>

      <section className="card mt-6 p-5">
        <h2 className="font-display text-[19px] font-extrabold">Der Score in drei Schritten</h2>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed">
          <li>
            <b>1. Umgebung messen.</b> Wir laden alle Einträge aus OpenStreetMap rund um die Adresse: Bahnhöfe, Bars, Restaurants, Parks, große Straßen, Gleise.
          </li>
          <li>
            <b>2. Sieben Werte von 1 bis 10.</b> Nach festen Regeln (siehe unten). Entfernungen rechnen wir als Fußweg: Luftlinie plus 25 %, 80 m pro Minute.
          </li>
          <li>
            <b>3. Gewichten.</b> Dein Score ist der Durchschnitt der Werte, gewichtet nach deinem Reise-Profil. Ohne Profil zählt Anbindung etwas mehr und Grün
            etwas weniger, alles andere gleich.
          </li>
        </ol>
      </section>

      <section className="mt-7 space-y-3">
        <h2 className="font-display text-[19px] font-extrabold">Die Regeln</h2>
        {RULES.map((r) => (
          <div key={r.title} className="card p-5">
            <h3 className="flex items-center gap-2 font-bold">
              <Icon name={r.icon} size={20} /> {r.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed">{r.how}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{r.scale}</p>
          </div>
        ))}
      </section>

      <section className="card mt-7 p-5">
        <h2 className="font-display text-[19px] font-extrabold">Was wir nicht wissen</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          <li>• Lärm im Gebäude: dünne Fenster, Zimmer zur Straße oder zum Hof.</li>
          <li>• Baustellen, Straßenfeste und Öffnungszeiten von Bars.</li>
          <li>• Sicherheit einzelner Straßen. Unsere Einschätzung gilt fürs ganze Viertel.</li>
          <li>• Lücken in OpenStreetMap. Wo kaum etwas eingetragen ist, zeigen wir „Datenlage dünn“.</li>
          <li>• Preise und Zimmerqualität. Dafür sind Bewertungen auf Buchungsportalen da.</li>
        </ul>
        <p className="mt-3 text-sm text-muted">Darum sind Tipps von Reisenden so wertvoll: Sie ergänzen, was keine Karte zeigt.</p>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Kartendaten © OpenStreetMap-Mitwirkende (ODbL). Suche über Photon (Komoot), Umgebung über die Overpass API.
      </p>
    </div>
  );
}
