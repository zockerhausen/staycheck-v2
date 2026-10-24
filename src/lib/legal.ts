// Angaben für Impressum und Datenschutz. NUR hier eintragen, die Seiten lesen alles von hier.
// Solange etwas fehlt (leere Zeichenkette), zeigen die Seiten einen deutlichen Hinweis statt erfundener Angaben.
export const OPERATOR = {
  name: "", // Vor- und Nachname (bei Firma: Firmenname + Rechtsform + vertretungsberechtigte Person)
  street: "", // Straße und Hausnummer (kein Postfach)
  city: "", // PLZ und Ort
  country: "Deutschland",
  email: "",
  phone: "", // optional, aber eine zweite schnelle Kontaktmöglichkeit ist Pflicht (E-Mail + Telefon oder Kontaktformular)
  vatId: "", // nur falls vorhanden (USt-IdNr.)
  commercial: false, // true, sobald die App Geld verdient (Werbung, Affiliate-Links, Abo)
};

export const LEGAL_UPDATED = "24. Oktober 2026";

export const legalComplete = () => Boolean(OPERATOR.name && OPERATOR.street && OPERATOR.city && OPERATOR.email);
