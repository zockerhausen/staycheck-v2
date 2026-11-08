// Reisedaten (Anreise, Nächte, Personen) aus der Adresse der Seite. Gelten für alle Preis-Links und die Preis-Karte.
export type Trip = { checkin: string; checkout: string; nights: number; adults: number; chosen: boolean };

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
  return { checkin: iso(checkinDate), checkout: iso(addDays(checkinDate, nights)), nights, adults, chosen: valid };
}

/** Reisedaten als Teil einer Adresse (nur wenn selbst gewählt) */
export const tripQuery = (t: Trip) => (t.chosen ? `&an=${t.checkin}&n=${t.nights}&p=${t.adults}` : "");
