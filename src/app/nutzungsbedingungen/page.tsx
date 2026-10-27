import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Nutzungsbedingungen – StayCheck", robots: { index: false } };

const UPDATED = "27. Oktober 2026";

export default function NutzungsbedingungenPage() {
  const o = OPERATOR;
  return (
    <LegalPage title="Nutzungsbedingungen" updated={UPDATED}>
      <p>
        <b className="text-ink">Kurz gesagt:</b> StayCheck hilft dir, eine gute Gegend und Unterkunft für deine Reise zu finden. Die App ist kostenlos. Unsere
        Werte sind ehrlich berechnete Einschätzungen, keine Garantie. Gebucht wird nicht bei uns, sondern beim jeweiligen Anbieter.
      </p>

      <Section title="1. Anbieter">
        <p>
          StayCheck wird angeboten von {o.name}, {o.street}, {o.city}, {o.country} (E-Mail: {o.email}). Diese Bedingungen gelten für die Nutzung der App und
          der Webseite StayCheck.
        </p>
      </Section>

      <Section title="2. Was StayCheck ist">
        <p>
          StayCheck bewertet die Lage von Vierteln und Unterkünften. Grundlage sind offene Kartendaten (vor allem OpenStreetMap), eigene Berechnungen,
          Bewertungen anderer Plattformen und Tipps von Reisenden. Wie wir rechnen, steht unter{" "}
          <Link href="/methode" className="font-bold text-sun-soft underline">
            So rechnen wir
          </Link>
          .
        </p>
        <p>
          Die Daten können unvollständig oder veraltet sein, zum Beispiel wenn ein Lokal geschlossen hat oder eine Unterkunft neu ist. Der Lage-Wert ist eine
          Einschätzung und keine Zusage, dass dir ein Ort gefällt oder dass er sicher ist. Prüfe Wichtiges wie Preise, Öffnungszeiten und aktuelle
          Sicherheitshinweise vor deiner Reise selbst.
        </p>
      </Section>

      <Section title="3. Nutzung und Konto">
        <p>Du kannst StayCheck ohne Konto nutzen. Ein Konto ist freiwillig und kostenlos.</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Ein Konto darfst du anlegen, wenn du mindestens 16 Jahre alt bist.</li>
          <li>Gib eine E-Mail-Adresse an, die dir gehört, und halte dein Passwort geheim.</li>
          <li>Du kannst dein Konto jederzeit unter „Konto“ selbst löschen. Damit endet auch dieser Nutzungsvertrag.</li>
        </ul>
      </Section>

      <Section title="4. Tipps von Reisenden">
        <p>Mit Konto kannst du kurze Tipps zu Orten schreiben. Dafür gilt:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Schreib nur über eigene Erfahrungen und bleib fair.</li>
          <li>Keine Werbung, keine Links, keine Beleidigungen und nichts, was gegen Gesetze verstößt.</li>
          <li>Keine Namen, Fotos oder anderen persönlichen Daten von anderen Menschen.</li>
        </ul>
        <p>
          Deine Tipps bleiben deine. Du erlaubst uns, sie kostenlos in StayCheck anzuzeigen, solange sie online sind. Du kannst eigene Tipps jederzeit
          löschen. Tipps, die gegen diese Regeln verstoßen, dürfen wir ausblenden oder löschen, bei wiederholten Verstößen auch das Konto sperren.
        </p>
        <p>
          Über „Melden“ unter jedem Tipp kannst du uns auf rechtswidrige oder unpassende Inhalte hinweisen. Wir prüfen Meldungen zeitnah. Mehrfach gemeldete
          Tipps werden sofort ausgeblendet, bis wir sie geprüft haben.
        </p>
      </Section>

      <Section title="5. Reise-Assistent (KI)">
        <p>
          Die Antworten des Reise-Assistenten entstehen automatisch durch ein KI-Modell. Sie können Fehler enthalten und ersetzen keine verbindlichen Auskünfte.
          Gib dort bitte keine sensiblen Daten ein, etwa Gesundheitsdaten oder Zahlungsdaten. Wie deine Fragen verarbeitet werden, steht in der{" "}
          <Link href="/datenschutz" className="font-bold text-sun-soft underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </Section>

      <Section title="6. Links zu Buchungsportalen">
        <p>
          Über „Preise vergleichen“ gelangst du zu anderen Anbietern, zum Beispiel Booking.com. Buchst du dort, schließt du den Vertrag direkt mit diesem
          Anbieter, es gelten dessen Bedingungen und Preise. StayCheck ist nicht Vertragspartner und hat keinen Einfluss auf Verfügbarkeit oder Preise.
        </p>
        <p>
          Manche dieser Links sind Partner-Links. Buchst du darüber, bekommen wir unter Umständen eine Provision. Für dich ändert sich der Preis dadurch nicht.
          Unsere Lage-Werte und Empfehlungen hängen nicht davon ab, ob es für eine Unterkunft eine Provision gibt.
        </p>
      </Section>

      <Section title="7. Verfügbarkeit und Änderungen">
        <p>
          Wir bemühen uns, dass StayCheck immer erreichbar ist, können das aber nicht garantieren, etwa bei Wartung oder Störungen bei Kartendiensten. Wir
          entwickeln StayCheck weiter und können Funktionen ändern, ergänzen oder einstellen.
        </p>
        <p>
          Ändern wir diese Bedingungen, gilt die neue Fassung ab ihrer Veröffentlichung hier. Bei wesentlichen Änderungen informieren wir Nutzer mit Konto
          vorher per E-Mail. Du kannst dein Konto dann jederzeit löschen.
        </p>
      </Section>

      <Section title="8. Haftung">
        <p>
          StayCheck ist kostenlos. Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit und nach dem
          Produkthaftungsgesetz. Bei leichter Fahrlässigkeit haften wir nur, wenn eine wesentliche Pflicht verletzt wird, auf die du vertrauen durftest, und
          dann begrenzt auf den typischen, vorhersehbaren Schaden. Für Inhalte und Leistungen anderer Anbieter, auf die wir verlinken, sind diese selbst
          verantwortlich.
        </p>
      </Section>

      <Section title="9. Recht">
        <p>
          Es gilt deutsches Recht. Wenn du Verbraucher bist, behältst du zusätzlich den Schutz der zwingenden Vorschriften des Landes, in dem du lebst. Sollte
          eine Regel dieser Bedingungen unwirksam sein, bleiben die übrigen gültig.
        </p>
      </Section>
    </LegalPage>
  );
}
