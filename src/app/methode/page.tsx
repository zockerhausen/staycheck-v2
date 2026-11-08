import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
import LegalLinks from "@/components/LegalLinks";
import type { IconName } from "@/lib/icons";

export const metadata: Metadata = { title: "So rechnen wir – StayCheck" };

// Klartext zu src/lib/score.ts – bei Änderungen an der Formel bitte hier mitändern.
const RULES: { icon: IconName; title: string; how: string; scale: string }[] = [
  {
    icon: "transit",
    title: "Anbindung",
    how: "Fußweg zum nächsten Bahnhof (S-/U-Bahn, Zug, Metro, Skytrain) im Umkreis von 900 m. Straßenbahn und Boote zählen weniger, weil sie seltener und langsamer fahren. Bus nur als Notlösung. Stationen im Bau oder außer Betrieb zählen nicht.",
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
    how: "Kartendaten kennen keine Sicherheit, deshalb gilt eine feste Regel mit Quellen: Grundwert für die Stadt laut Reiseführer (Berlin 8, Bangkok 7). Minus 1 für jeden offiziellen Kriminalitätsschwerpunkt der Polizei im Viertel und für jede Quelle, die dort vor Raub, Überfällen oder gezielter Abzocke warnt, höchstens minus 2. Jeder Wert zeigt seine Begründung und Quelle. Wo wir keine Quelle haben, fließt Sicherheit nicht in den Score ein.",
    scale: "Nur in Städten mit geprüften Vierteln (Berlin, Bangkok), Stand November 2026",
  },
  {
    icon: "budget",
    title: "Günstig",
    how: "Die Zahl der Hostels und Pensionen im Umkreis von 800 m. Preise kennen wir nicht, deshalb schätzen wir kein Preisniveau. Echte Preise siehst du beim Buchungsportal.",
    scale: "keins = 4 · bis 2 = 6 · bis 5 = 8 · mehr = 9",
  },
  {
    icon: "cart",
    title: "Extras: Supermarkt, Cafés, Sehenswertes, Waschsalon, Fitness, Strand",
    how: "Zählen nur, wenn du sie in deinem Reise-Profil gewählt hast. Wir messen den Fußweg zum Nächsten. Bei Cafés zählen auch Coworking-Spaces (ob es WLAN gibt, steht selten in der Karte).",
    scale: "bis 3 Min. = 10 · bis 5 Min. = 9 · bis 8 Min. = 7 · bis 12 Min. = 5 · weiter = 3 · nichts gefunden = 1",
  },
];

export default function MethodePage() {
  return (
    <div className="fade-up">
      <div className="flex items-center justify-between">
        <BackButton fallback="/check" className="press flex h-11 w-11 items-center justify-center rounded-full glass border border-[var(--sc-glass-line)] shadow-soft">
          <Icon name="back" size={18} />
        </BackButton>
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
            <b>1. Umgebung messen.</b> Wir laden alle Einträge aus OpenStreetMap rund um die Adresse: Bahnhöfe, Bars, Restaurants, Parks, große Straßen, Gleise. In vorberechneten Städten ergänzen wir Bars, Restaurants und Hostels aus Overture Maps, wenn sie in OpenStreetMap fehlen. Was in beiden steht, zählen wir nur einmal, unsichere Einträge lassen wir weg.
          </li>
          <li>
            <b>2. Sieben Werte von 1 bis 10.</b> Nach festen Regeln (siehe unten). Entfernungen rechnen wir als Fußweg: Luftlinie plus 25 %, 80 m pro Minute. In vorberechneten Städten prüfen wir zusätzlich das echte Wegenetz: Was nur mit großem Umweg erreichbar ist (zum Beispiel auf der anderen Flussseite ohne Brücke oder hinter Gleisen), zählen wir nicht mit.
          </li>
          <li>
            <b>Plus Reiseführer.</b> In vorberechneten Städten fließt auch der freie Reiseführer Wikivoyage ein: Wie viele Bars und Restaurants
            empfehlen Reisende dort, und sind die empfohlenen Unterkünfte günstiger oder teurer als in der ganzen Stadt? Das zählt höchstens zur Hälfte,
            weniger, wenn der Artikel dünn ist, die Einträge alt sind oder es nur wenige gibt. Empfiehlt der Reiseführer an einer Stelle nichts, zählt nur
            die Karte (er ist nur eine Auswahl). Bei jedem Wert siehst du beide Zahlen und den Artikel als Quelle (Lizenz CC BY-SA 4.0).
          </li>
          <li>
            <b>Zwei Zahlen.</b> „Lage allgemein“ ist für alle gleich (Standard-Gewichtung, ohne Extras). „Dein Match“ rechnet mit deinem Reise-Profil.
            So siehst du, ob ein Ort generell gut liegt oder nur für dich passt – oder umgekehrt.
          </li>
          <li>
            <b>Dein Muss.</b> Hast du ein Extra als Muss markiert und es liegt nicht in ca. 8 Minuten zu Fuß (Wert 3 oder weniger), ist dein
            Match höchstens 60 – egal wie gut der Rest ist. Wir sagen dir dann genau, was fehlt.
          </li>
          <li>
            <b>Deine No-Gos.</b> Trifft eins zu, ist dein Match höchstens 45: Partymeile vor der Tür (Ausgehen 8,5 von 10 oder mehr), laut die
            ganze Nacht (Ruhe 2,5 oder weniger), weit draußen (Anbindung 2,5 oder weniger und Essen 4 oder weniger), unsichere Gegend (Sicherheit 4
            oder weniger). Fehlen uns an einer Stelle Daten, schließen wir dort nichts aus.
          </li>
          <li>
            <b>3. Gewichten.</b> Dein Match ist der Durchschnitt der Werte, gewichtet nach deinem Reise-Profil. Was dir „sehr wichtig“ ist (5), zählt
            25-mal so viel wie „wenig wichtig“ (1): Die Wichtigkeit zählt im Quadrat. So entscheidet, was dir wirklich wichtig ist. Außerdem ziehen
            schwache Werte etwas stärker nach unten, als starke nach oben ziehen: Viel Mittelmaß gleicht eine echte Schwäche nicht aus. Sind alle
            Werte gleich, kommt genau dieser Wert heraus. Ohne Profil zählt Anbindung etwas mehr und Grün etwas weniger, alles andere gleich.
          </li>
          <li>
            <b>4. Vergleichen.</b> In großen Städten liegen viele zentrale Viertel nah beieinander, die Zahlen sind dann ähnlich. Deshalb zeigen wir
            zusätzlich den Platz in der Stadt, und die Karte lässt nur die besten kleinen Spots leuchten: in jedem Viertel die beste Ecke (der beste
            Punkt unseres Rasters und Nachbarn, die fast genauso gut sind), auf der Startseite die besten Ecken der ganzen Stadt.
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
        <h2 className="font-display text-[19px] font-extrabold">Viertel und ihr Charakter</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Eigenschaften wie „Feiern“ oder „Ruhig“ bekommt ein Viertel, wenn sein Wert hoch ist (z. B. Ruhe ab 7, Nachtleben ab 8) und es damit zur
          besseren Hälfte der Stadt gehört. Was in einer Stadt überall gilt, ist dort keine Besonderheit.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Geprüfte Städte (Berlin, Bangkok) haben von uns bewertete Viertel. In allen anderen Städten finden wir die Stadtteile automatisch in
          OpenStreetMap und zählen rund um ihre Mitte Bahnhöfe, Bars, Restaurants, Parks und Hostels. Das ist gröber, Sicherheit fehlt dort.
        </p>
      </section>

      <section className="card mt-7 p-5">
        <h2 className="font-display text-[19px] font-extrabold">Ecken statt Bezirke</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Über jede Stadt legen wir ein Raster mit Punkten alle 350 m und messen an jedem Punkt dieselben Werte. Die besten Punkte für dein Profil
          (etwa die besten 15 %, mindestens 58 % Match) verbinden wir zu Ecken von höchstens rund einem Kilometer und benennen sie nach dem
          nächsten Kiez in OpenStreetMap.
        </p>
      </section>

      <section className="card mt-7 p-5">
        <h2 className="font-display text-[19px] font-extrabold">Was der Reiseführer sagt (bis 50 %)</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Zählen allein reicht nicht: 30 Bars können Touristenfallen sein. Darum fließt der freie Reiseführer Wikivoyage ein, geschrieben von Reisenden.
          Andere Reiseportale erlauben nicht, ihre Bewertungen zu speichern und zu verrechnen, deshalb nutzen wir sie nicht.
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          <li>• <b>Empfehlungen:</b> Wie viele Bars und Restaurants empfehlen Reisende in der Nähe, und sind die empfohlenen Unterkünfte günstiger oder teurer als in der ganzen Stadt?</li>
          <li>• <b>Texte:</b> Was schreibt der Reiseführer über die Gegend, etwa „lautes Ausgehviertel“ oder „viel Abzocke“? Eine kleine KI liest nur diesen Text und muss für jeden Wert einen wörtlichen Satz daraus nennen. Wir prüfen, ob der Satz wirklich dort steht, sonst zählt der Wert nicht.</li>
          <li>• <b>Wie stark es zählt:</b> höchstens zur Hälfte, weniger bei dünnen Artikeln, alten Einträgen (seit über 4 Jahren nicht geprüft) oder nur wenigen Empfehlungen. Gliederungs-Artikel zählen gar nicht.</li>
          <li>• <b>Nichts empfohlen heißt nicht „nichts da“:</b> Der Reiseführer ist eine Auswahl. Wo er nichts sagt, zählt nur die Karte.</li>
          <li>• Bei jedem Wert siehst du beide Zahlen und den Artikel zum Anklicken. Empfehlungen werden jeden Monat neu ausgewertet, Texte alle drei Monate.</li>
        </ul>
      </section>

      <section className="card mt-7 p-5">
        <h2 className="font-display text-[19px] font-extrabold">„So fühlt es sich an“</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Der Tagesablauf folgt fest aus den Werten, zum Beispiel: Essen ab 8 = „viele Cafés in Laufweite“, Ruhe bis 3 oder Nachtleben ab 9 =
          „bis spät belebt“, Bahn ab 8 = „Bahn in wenigen Minuten“. „Passt gut zu“ und „Eher nicht für“ nutzen dieselben Schwellen.
        </p>
      </section>

      <section className="card mt-7 p-5">
        <h2 className="font-display text-[19px] font-extrabold">Was wir nicht wissen</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          <li>• Lärm im Gebäude: dünne Fenster, Zimmer zur Straße oder zum Hof.</li>
          <li>• Baustellen, Straßenfeste und Öffnungszeiten von Bars.</li>
          <li>• Sicherheit einzelner Straßen. Der Sicherheitswert gilt fürs ganze Viertel.</li>
          <li>• Lücken in OpenStreetMap. Wo kaum etwas eingetragen ist, zeigen wir „Datenlage dünn“.</li>
          <li>• Preise und Zimmerqualität. Dafür sind Bewertungen auf Buchungsportalen da.</li>
        </ul>
        <p className="mt-3 text-sm text-muted">Darum sind Tipps von Reisenden so wertvoll: Sie ergänzen, was keine Karte zeigt.</p>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Kartendaten © OpenStreetMap-Mitwirkende (ODbL), vorberechnet aus Geofabrik-Auszügen. Zusätzliche Orte: © Overture Maps Foundation (CDLA Permissive 2.0). Reiseführer-Einträge und -Texte: Wikivoyage-Autorinnen und -Autoren (CC BY-SA 4.0). Flughäfen: OurAirports (gemeinfrei). Suche über Photon (Komoot), sonst Umgebung über die Overpass API.
      </p>
      <LegalLinks className="mt-10" />
    </div>
  );
}
