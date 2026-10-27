import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section } from "@/components/LegalPage";
import Icon from "@/components/Icon";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Hilfe – StayCheck", description: "Antworten auf häufige Fragen und Kontakt zu StayCheck." };

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Wie entsteht der Lage-Wert?",
    a: (
      <>
        Wir zählen rund um jede Unterkunft, was Reisende brauchen: Bahn und Bus, Restaurants, Bars, Parks, Ruhe, günstige Unterkünfte. Daraus wird ein
        Wert von 0 bis 100, gewichtet nach deinem Reise-Profil. Jeder Wert lässt sich aufklappen, damit du siehst, woher er kommt.{" "}
        <Link href="/methode" className="font-bold text-sun-soft underline underline-offset-4">
          So rechnen wir genau
        </Link>
      </>
    ),
  },
  {
    q: "Woher kommen die Gäste-Bewertungen?",
    a: "Von Bewertungsplattformen, die wir offiziell angeschlossen haben. Wir rechnen alle auf 10 Punkte um und gewichten nach Anzahl der Bewertungen. Gibt es für eine Unterkunft keine Bewertungen, zeigen wir auch keine an.",
  },
  {
    q: "Kann ich über StayCheck buchen?",
    a: "Nein. StayCheck hilft dir, die richtige Gegend und Unterkunft zu finden. „Preise vergleichen“ bringt dich zu einem Buchungsportal, dort buchst du direkt beim Anbieter.",
  },
  {
    q: "Brauche ich ein Konto?",
    a: "Nein, alles funktioniert auch ohne. Mit einem Konto (ab 16 Jahren) sind dein Reise-Profil und gemerkte Orte auf allen Geräten da, und du kannst Tipps schreiben.",
  },
  {
    q: "Wie lösche ich mein Konto?",
    a: "Unten auf „Konto“ tippen, dann „Konto löschen“. Dein Konto und alle Daten dazu sind danach sofort und endgültig gelöscht.",
  },
  {
    q: "Wie stelle ich hell oder dunkel ein?",
    a: "Auf der Startseite oben rechts auf Mond oder Sonne tippen. Im Reise-Profil kannst du auch „Wie Handy“ wählen.",
  },
  {
    q: "Ein Hotel fehlt oder eine Angabe stimmt nicht.",
    a: "Unsere Kartendaten kommen aus OpenStreetMap und werden jeden Monat neu berechnet. Was dort fehlt, fehlt auch bei uns. Schreib uns gern, dann schauen wir nach. Du kannst Fehler auch direkt auf openstreetmap.org korrigieren, dann sind sie beim nächsten Mal hier.",
  },
  {
    q: "Wie melde ich einen unpassenden Tipp?",
    a: "Unter jedem Tipp gibt es „Melden“. Nach mehreren Meldungen ist ein Tipp sofort ausgeblendet, und wir prüfen ihn.",
  },
  {
    q: "Wie zuverlässig ist der Reise-Assistent?",
    a: "Er stützt sich auf unsere Daten und sucht für Aktuelles im Internet. Trotzdem kann eine KI sich irren. Wichtiges wie Preise, Öffnungszeiten oder Sicherheitshinweise bitte vor Ort oder bei offiziellen Stellen prüfen.",
  },
];

export default function HilfePage() {
  const mail = (subject: string) => `mailto:${OPERATOR.email}?subject=${encodeURIComponent(subject)}`;
  return (
    <LegalPage title="Hilfe">
      <div className="grid grid-cols-2 gap-2.5">
        <a href={mail("StayCheck: Frage")} className="press rounded-[20px] bg-paper p-4">
          <Icon name="tip" size={24} className="text-sun" />
          <b className="mt-2 block text-[16px] font-black text-ink">Frage stellen</b>
          <span className="block text-[13px] font-semibold text-muted">per E-Mail</span>
        </a>
        <a href={mail("StayCheck: Fehler gefunden")} className="press rounded-[20px] bg-paper p-4">
          <Icon name="flag" size={24} className="text-sun" />
          <b className="mt-2 block text-[16px] font-black text-ink">Fehler melden</b>
          <span className="block text-[13px] font-semibold text-muted">Was ist passiert?</span>
        </a>
      </div>

      <Section title="Häufige Fragen">
        <div className="-mt-1">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-line last:border-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[16px] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <Icon name="down" size={16} className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-[15px] font-semibold text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section title="Kontakt">
        <p>
          {OPERATOR.name}
          <br />
          E-Mail:{" "}
          <a className="font-bold text-sun-soft underline" href={`mailto:${OPERATOR.email}`}>
            {OPERATOR.email}
          </a>
        </p>
        <p>Wir antworten in der Regel innerhalb weniger Tage. Bitte schick uns keine Passwörter oder Zahlungsdaten.</p>
      </Section>
    </LegalPage>
  );
}
