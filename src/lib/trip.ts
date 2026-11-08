// Reisedaten (Anreise, Nächte, Personen) aus der Adresse der Seite. Gelten für alle Preis-Links und die Preis-Karte.
export type Trip = {
  checkin: string;
  checkout: string;
  nights: number;
  adults: number;
  chosen: boolean;
  /** Höchstpreis pro Nacht in Euro: Zahl, null = egal, undefined = nicht gewählt (dann gilt das Budget aus dem Profil) */
  max: number | null | undefined;
};

/** Auswahl für „Höchstens pro Nacht“ */
export const MAX_OPTIONS = [15, 20, 25, 30, 40, 50, 70, 100, 150, 200];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export function parseTrip(sp: Record<string, string | string[] | undefined>): Trip {
  const today = new Date();
  const raw = typeof sp.an === "string" ? sp.an : "";
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(`${raw}T12:00:00Z`));
  const start = valid ? new Date(`${raw}T12:00:00Z`) : addDays(today, 14);
  // nicht in der Vergangenheit und höchstens ein Jahr im Voraus
  const checkinDate = start < addDays(today, -1) || start > addDays(today, 365) ? addDays(today, 14) : start;
  const nights = Math.min(30, Math.max(1, Math.round(Number(sp.n) || 2)));
  const adults = Math.min(8, Math.max(1, Math.round(Number(sp.p) || 1)));
  const m = typeof sp.max === "string" ? Number(sp.max) : NaN;
  const max = sp.max === "0" ? null : MAX_OPTIONS.includes(m) ? m : undefined;
  return { checkin: iso(checkinDate), checkout: iso(addDays(checkinDate, nights)), nights, adults, chosen: valid, max };
}

/** Reisedaten als Teil einer Adresse (nur wenn selbst gewählt) */
export const tripQuery = (t: Trip) =>
  (t.chosen ? `&an=${t.checkin}&n=${t.nights}&p=${t.adults}` : "") + (t.max === undefined ? "" : `&max=${t.max ?? 0}`);

/** Welche geschätzte Preisklasse passt höchstens zu diesem Budget pro Nacht? (1 = Hostel/Pension, 2 = Mittelklasse) */
export const classCap = (max: number | null) => (max === null ? 3 : max <= 35 ? 1 : max <= 90 ? 2 : 3);
