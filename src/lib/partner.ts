// Partner-Links (Provision bei Buchungen). Ohne Partner-ID bleibt alles wie bisher: normale Links, keine Anzeigen.
// Die Stay22-ID ist nicht geheim (sie steht in jedem Link), deshalb NEXT_PUBLIC_.

const RAW = (process.env.NEXT_PUBLIC_STAY22_AID ?? "").trim();
/** Stay22-Partner-ID, nur wenn sie gültig aussieht */
export const STAY22_AID = /^[A-Za-z0-9_-]{2,60}$/.test(RAW) ? RAW : "";
export const partnerOn = STAY22_AID !== "";

/** Kampagnen-Name für die Auswertung bei Stay22 (nur Buchstaben, Zahlen, Unterstriche) */
const campaignOf = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "staycheck";

/**
 * Link zu Preisen für einen Ort oder eine bestimmte Unterkunft.
 * Mit Partner-ID: Stay22 „Allez“ zu Booking.com (Buchung zählt für uns). Ohne: normale Booking-Suche.
 */
export function priceLink(o: {
  lat: number;
  lon: number;
  hotel?: string;
  address?: string;
  campaign: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
  /** Höchstpreis pro Nacht (EUR): Booking zeigt dann nur Zimmer bis zu diesem Preis, günstigste zuerst */
  maxPrice?: number | null;
}) {
  // Booking-Suche: Name + Adresse, Reisedaten, Personen, Budget pro Nacht
  // Mit Budget: Suche im Umkreis statt nach einem Hotelnamen. Bei einem einzelnen Hotel ignoriert Booking den Preisfilter.
  const ss = o.maxPrice ? "" : [o.hotel, o.address].filter(Boolean).join(", ");
  const q = new URLSearchParams({ lang: "de", selected_currency: "EUR", group_adults: String(o.adults ?? 1), no_rooms: "1", group_children: "0" });
  if (ss) q.set("ss", ss);
  else {
    q.set("latitude", o.lat.toFixed(6));
    q.set("longitude", o.lon.toFixed(6));
    q.set("radius", "1");
  }
  if (o.checkin && o.checkout) {
    q.set("checkin", o.checkin);
    q.set("checkout", o.checkout);
  }
  if (o.maxPrice) {
    q.set("nflt", `price=EUR-0-${o.maxPrice}-1`);
    q.set("order", "price");
  }
  const booking = `https://www.booking.com/searchresults.html?${q}`;
  if (!partnerOn) return booking;
  // Über Stay22 „Allez“ (Buchung zählt für uns), mit genau dieser Booking-Suche. Immer Booking.com: öffnet direkt die Seite
  // („roam“ wählt sonst oft Expedia, das auf dem Handy erst eine „App oder Website?“-Zwischenseite zeigt).
  const p = new URLSearchParams({ aid: STAY22_AID, link: booking, campaign: campaignOf(o.campaign) });
  return `https://www.stay22.com/allez/booking?${p}`;
}

/**
 * Link zu genau einer Unterkunft – egal, bei welchem Anbieter sie gelistet ist.
 * Mit Partner-ID: Stay22 sucht sie per Name bei Booking.com, Expedia, Hotels.com und Agoda und leitet direkt zu ihrer Seite
 * (findet sich keine, Unterkünfte an dieser Stelle). Ohne Partner-ID: normale Booking-Suche.
 */
export function stayLink(o: {
  name: string;
  lat: number;
  lon: number;
  /** Stadt und Land, z. B. „Berlin, Deutschland“ (hilft der Zuordnung) */
  place: string;
  campaign: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
}) {
  if (!partnerOn) return priceLink({ lat: o.lat, lon: o.lon, hotel: o.name, address: o.place, campaign: o.campaign, checkin: o.checkin, checkout: o.checkout, adults: o.adults });
  const p = new URLSearchParams({
    aid: STAY22_AID,
    campaign: campaignOf(o.campaign),
    hotelname: o.name.slice(0, 120),
    address: o.place.slice(0, 120),
    lat: o.lat.toFixed(6),
    lng: o.lon.toFixed(6),
    adults: String(Math.min(8, Math.max(1, o.adults ?? 1))),
    currency: "EUR",
    lang: "de",
    excludeproviders: "vrbo", // Ferienwohnungs-Portal, passt nicht zu Hotels und Hostels
  });
  if (o.checkin && o.checkout) {
    p.set("checkin", o.checkin);
    p.set("checkout", o.checkout);
  }
  return `https://www.stay22.com/allez/roam?${p}`;
}

/** Höchstpreis pro Nacht (EUR) aus dem Budget im Profil (1 = bis ca. 30 €, 2 = 30–80 €, 3 = egal), solange keiner gewählt ist */
export const maxPriceFor = (band: number | null | undefined) => (band === 1 ? 30 : band === 2 ? 80 : null);
