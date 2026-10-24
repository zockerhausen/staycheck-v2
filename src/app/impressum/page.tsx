import type { Metadata } from "next";
import LegalPage, { Field, Section } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum – StayCheck", robots: { index: false } };

export default function ImpressumPage() {
  const o = OPERATOR;
  return (
    <LegalPage title="Impressum">
      <Section title="Angaben gemäß § 5 DDG">
        <p>
          <Field value={o.name} label="Name" />
          <br />
          {o.street}{!/\d/.test(o.street) && <> <Field value="" label="Hausnummer" /></>}
          <br />
          <Field value={o.city} label="PLZ und Ort" />
          <br />
          {o.country}
        </p>
      </Section>

      <Section title="Kontakt">
        <p>
          E-Mail:{" "}
          {o.email ? (
            <a className="text-sun-soft underline" href={`mailto:${o.email}`}>
              {o.email}
            </a>
          ) : (
            <Field value="" label="E-Mail" />
          )}
          {o.email2 && (
            <>
              <br />
              Weitere E-Mail:{" "}
              <a className="text-sun-soft underline" href={`mailto:${o.email2}`}>
                {o.email2}
              </a>
            </>
          )}
          {o.phone && (
            <>
              <br />
              Telefon: {o.phone}
            </>
          )}
        </p>
      </Section>

      {o.vatId && (
        <Section title="Umsatzsteuer-ID">
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {o.vatId}</p>
        </Section>
      )}

      <Section title="Verantwortlich für den Inhalt">
        <p>
          <Field value={o.name} label="Name" />, Anschrift wie oben.
        </p>
      </Section>

      <Section title="Haftung für Inhalte">
        <p>
          Die Bewertungen in StayCheck werden automatisch aus offenen Kartendaten (OpenStreetMap) berechnet. Wir erklären unter „So rechnen wir“ genau, wie.
          Sie sind eine Orientierungshilfe und keine Garantie für die tatsächliche Lage, Sicherheit oder Qualität einer Unterkunft. Bitte prüfe vor einer
          Buchung selbst.
        </p>
        <p>
          Tipps von Reisenden sind Inhalte der jeweiligen Nutzer:innen. Wir prüfen sie nicht vorab, entfernen aber rechtswidrige Inhalte, sobald wir davon
          erfahren. Über „Melden“ an jedem Tipp oder per E-Mail kannst du uns darauf hinweisen.
        </p>
      </Section>

      <Section title="Haftung für Links">
        <p>
          StayCheck verlinkt auf externe Seiten (zum Beispiel Buchungsportale und Karten). Auf deren Inhalte haben wir keinen Einfluss, dafür sind
          ausschließlich deren Betreiber verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir solche Links umgehend.
        </p>
      </Section>

      <Section title="Kartendaten">
        <p>
          Kartendaten © OpenStreetMap-Mitwirkende, verfügbar unter der Open Database License (ODbL). Kartenstil: OpenFreeMap, OpenMapTiles.
        </p>
      </Section>

      {o.commercial && (
        <Section title="Verbraucherstreitbeilegung">
          <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </Section>
      )}
    </LegalPage>
  );
}
