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
 * Mit Partner-ID: Stay22 „Allez“ (wählt die passende Buchungsseite, Buchung zählt für uns). Ohne: normale Booking-Suche.
 */
export function priceLink(o: { lat: number; lon: number; hotel?: string; address?: string; campaign: string }) {
  if (!partnerOn) {
    const ss = [o.hotel, o.address].filter(Boolean).join(", ");
    return `https://www.booking.com/searchresults.html?${new URLSearchParams({ ss, lang: "de", group_adults: "1", no_rooms: "1" })}`;
  }
  const p = new URLSearchParams({ aid: STAY22_AID, lat: o.lat.toFixed(6), lng: o.lon.toFixed(6), campaign: campaignOf(o.campaign), lang: "de", currency: "EUR" });
  if (o.hotel) p.set("hotelname", o.hotel.slice(0, 120));
  if (o.address) p.set("address", o.address.slice(0, 160));
  return `https://www.stay22.com/allez/roam?${p}`;
}

/**
 * Karte/Liste mit echten Unterkünften, Preisen und Gästebewertungen (Stay22) – nur mit Partner-ID.
 * Alles Bedienbare von Stay22 (Suche, Datum, Gäste, Filter, Extra-Knopf) ist ausgeblendet: Datum und Gäste wählt man bei uns.
 */
export function stayMapUrl(o: {
  lat: number;
  lon: number;
  campaign: string;
  view: "map" | "listview";
  checkin: string;
  checkout: string;
  adults: number;
  maxPrice?: number | null;
  dark?: boolean;
}) {
  if (!partnerOn) return null;
  const p = new URLSearchParams({
    aid: STAY22_AID,
    lat: o.lat.toFixed(6),
    lng: o.lon.toFixed(6),
    zoom: "15",
    viewmode: o.view,
    campaign: campaignOf(o.campaign),
    checkin: o.checkin,
    checkout: o.checkout,
    adults: String(Math.min(8, Math.max(1, o.adults))),
    maincolor: "5340f2",
    mapstyle: o.dark ? "dark" : "light",
    ljs: "de",
    currency: "EUR",
    unitsystem: "metric",
    priceper: "nightly",
    limit: "30",
  });
  for (const h of ["searchbar", "filters", "checkinout", "guestpicker", "settings", "currency", "language", "brandlogo", "allezbutton", "modeswitcher", "enlargemap", "navbuttons"])
    p.set(`hide${h}`, "true");
  if (o.maxPrice) p.set("max", String(o.maxPrice));
  return `https://www.stay22.com/embed/gm?${p}`;
}

/** Höchstpreis pro Nacht (EUR) aus dem Budget im Profil (1 = bis ca. 30 €, 2 = 30–80 €, 3 = egal) */
export const maxPriceFor = (band: number | null | undefined) => (band === 1 ? 60 : band === 2 ? 120 : null);
