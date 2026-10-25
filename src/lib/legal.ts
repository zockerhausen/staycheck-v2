// Angaben für Impressum und Datenschutz. NUR hier eintragen, die Seiten lesen alles von hier.
// Solange etwas fehlt (leere Zeichenkette), zeigen die Seiten einen deutlichen Hinweis statt erfundener Angaben.
export const OPERATOR = {
  name: "Pauljonas Beth", // Vor- und Nachname (bei Firma: Firmenname + Rechtsform + vertretungsberechtigte Person)
  street: "Anna-Mackenroth-Weg 17", // Straße und Hausnummer (kein Postfach)
  city: "12205 Berlin", // PLZ und Ort
  country: "Deutschland",
  email: "pauljonas.beth@me.com",
  email2: "zockerhausen.77@web.de", // zweite Kontaktmöglichkeit
  phone: "0160 99745799", // optional, aber eine zweite schnelle Kontaktmöglichkeit ist Pflicht (E-Mail + Telefon oder Kontaktformular)
  vatId: "", // nur falls vorhanden (USt-IdNr.)
  commercial: false, // true, sobald die App Geld verdient (Werbung, Affiliate-Links, Abo)
};

export const LEGAL_UPDATED = "24. Oktober 2026";

export const legalComplete = () => Boolean(OPERATOR.name && /\d/.test(OPERATOR.street) && OPERATOR.city && OPERATOR.email);
