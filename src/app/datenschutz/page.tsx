import type { Metadata } from "next";
import LegalPage, { Field, Section } from "@/components/LegalPage";
import { LEGAL_UPDATED, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Datenschutz – StayCheck", robots: { index: false } };

// Klartext zu dem, was die App technisch tut. Bei neuen Diensten, Cookies oder Tracking hier mitändern.
export default function DatenschutzPage() {
  const o = OPERATOR;
  return (
    <LegalPage title="Datenschutz" updated={LEGAL_UPDATED}>
      <p className="rounded-2xl bg-paper p-4">
        <b className="text-ink">Kurz gesagt:</b> Kein Tracking, keine Werbung, keine Analyse-Tools. Du kannst StayCheck ohne Konto nutzen. Mit Konto speichern
        wir nur, was du selbst anlegst, und du kannst alles jederzeit löschen.
      </p>

      <Section title="1. Verantwortlich">
        <p>
          <Field value={o.name} label="Name" />, <Field value={o.street} label="Straße" />, <Field value={o.city} label="PLZ und Ort" />, {o.country}. E-Mail:{" "}
          <Field value={o.email} label="E-Mail" />
        </p>
      </Section>

      <Section title="2. Beim Aufrufen der App">
        <p>
          Die App läuft bei Vercel Inc. (USA). Bei jedem Aufruf verarbeitet Vercel technisch nötige Daten wie IP-Adresse, Zeitpunkt, aufgerufene Seite und
          Browsertyp, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren Betrieb (Art.
          6 Abs. 1 lit. f DSGVO). Vercel ist nach dem EU-US Data Privacy Framework zertifiziert; zusätzlich gelten die EU-Standardvertragsklauseln.
        </p>
        <p>
          Um zu viele Anfragen in kurzer Zeit zu bremsen, hält unser Server die IP-Adresse kurz im Arbeitsspeicher (Zeitfenster eine Minute). Sie wird
          nicht dauerhaft gespeichert.
        </p>
      </Section>

      <Section title="3. Orte, Suchen und Lage-Checks">
        <p>
          Wenn du ein Reiseziel suchst, eine Adresse prüfst oder einen Buchungslink einfügst, schickt unser Server den Suchbegriff bzw. die Koordinaten an
          offene Kartendienste: Photon (komoot GmbH, Deutschland) für die Ortssuche und Overpass-Server der OpenStreetMap-Community für die Umgebungsdaten.
          Diese Anfragen kommen von unserem Server, nicht von deinem Gerät, deine IP-Adresse wird dabei also nicht weitergegeben. Eingefügte Links rufen wir
          nur auf, um den Ort darin zu erkennen.
        </p>
        <p>
          Die Karten selbst lädt dein Browser direkt von OpenFreeMap (tiles.openfreemap.org). Dabei sieht OpenFreeMap deine IP-Adresse und welchen
          Kartenausschnitt du ansiehst. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (eine Karte anzeigen).
        </p>
        <p>
          „Mein Standort“ fragt dein Gerät nur, wenn du darauf tippst und es erlaubst. Der Standort wird nur für diesen einen Lage-Check verwendet und nicht
          gespeichert.
        </p>
      </Section>

      <Section title="4. Cookies und Speicher im Browser">
        <p>Wir setzen nur Cookies, die für die Funktionen nötig sind, die du selbst nutzt. Deshalb gibt es kein Cookie-Banner (§ 25 Abs. 2 TDDDG).</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b className="text-ink">sc_profil, sc_extra, sc_stadt:</b> dein Reise-Profil aus dem Quiz und dein gewähltes Reiseziel, damit der Match für
            dich stimmt. Bis zu 1 Jahr.
          </li>
          <li>
            <b className="text-ink">sb-…:</b> deine Anmeldung, nur wenn du ein Konto nutzt. Bis zur Abmeldung.
          </li>
          <li>
            <b className="text-ink">Lokaler Speicher (sc_recent, sc_ziele):</b> deine zuletzt geprüften Orte und Reiseziele. Bleibt nur auf deinem Gerät und
            wird nie an uns geschickt.
          </li>
        </ul>
        <p>Du kannst das alles jederzeit in deinem Browser löschen.</p>
      </Section>

      <Section title="5. Mit Konto">
        <p>
          Für ein Konto speichern wir deine E-Mail-Adresse, ein verschlüsseltes Passwort, dein Reise-Profil, gemerkte Orte und Viertel sowie Tipps, die du
          schreibst. Rechtsgrundlage ist der Nutzungsvertrag (Art. 6 Abs. 1 lit. b DSGVO). Die Daten liegen bei Supabase Inc. (USA) in einem Rechenzentrum in
          Singapur. Für die Übermittlung gelten die EU-Standardvertragsklauseln. Zur Bestätigung deiner E-Mail-Adresse verschickt Supabase eine E-Mail.
        </p>
        <p>
          Tipps erscheinen öffentlich, aber ohne deinen Namen oder deine E-Mail-Adresse. Wenn du einen Tipp meldest, speichern wir die Meldung mit deinem
          Konto, damit niemand mehrfach meldet.
        </p>
        <p>
          <b className="text-ink">Löschen:</b> Unter Konto → „Konto löschen“ löschst du dein Konto mit allen Daten sofort und endgültig.
        </p>
      </Section>

      <Section title="6. Externe Links">
        <p>
          Links zu Buchungsportalen oder Google Maps öffnen die Seiten dieser Anbieter. Erst dann gelten deren Datenschutzregeln. Wir bekommen dafür kein Geld
          und geben keine Daten an sie weiter.
        </p>
      </Section>

      <Section title="7. Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO).
          Schreib uns dafür einfach an <Field value={o.email} label="E-Mail" />. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren,
          zum Beispiel bei der deines Bundeslands.
        </p>
      </Section>

      <Section title="8. Keine Pflicht">
        <p>Du musst uns keine Daten geben. Ohne Konto funktionieren Suche, Quiz und Lage-Check trotzdem, nur Merken auf mehreren Geräten geht dann nicht.</p>
      </Section>
    </LegalPage>
  );
}
