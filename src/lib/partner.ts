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
 * Karte/Liste mit echten Unterkünften, Preisen und Gästebewertungen (Stay22) – nur mit Partner-ID.
 * Alles Bedienbare von Stay22 (Suche, Datum, Gäste, Filter, Extra-Knopf) ist ausgeblendet: Datum und Gäste wählt man bei uns.
 */
export function stayMapUrl(o: {
  lat: number;
  lon: number;
  campaign: string;
  checkin: string;
  checkout: string;
  adults: number;
  maxPrice?: number | null;
  dark?: boolean;
  /** Eigene Pins (unsere Lage-Werte) auf derselben Karte */
  pois?: { lat: number; lng: number; name: string; desc?: string; url?: string }[];
  zoom?: number;
  /** Pin genau an dieser Stelle (z. B. die angetippte Unterkunft) */
  pin?: boolean;
  /** Kreise um die besten Spots (als Linien auf der Karte) */
  circles?: { lat: number; lon: number; r: number }[];
  origin?: string;
}) {
  if (!partnerOn) return null;
  const p = new URLSearchParams({
    aid: STAY22_AID,
    lat: o.lat.toFixed(6),
    lng: o.lon.toFixed(6),
    zoom: String(o.zoom ?? 14),
    viewmode: "map",
    hotelsapi: "booking", // Klicks auf der Karte ebenfalls direkt zu Booking.com
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
  if (o.pois?.length) {
    p.set("poi", JSON.stringify(o.pois.slice(0, 15).map((x) => ({ ...x, lat: +x.lat.toFixed(5), lng: +x.lng.toFixed(5), size: "small" }))));
    p.set("chpincolor", "5340f2");
    p.set("chpinfontcolor", "ffffff");
  }
  if (!o.pin) p.set("hidemainmarker", "true");
  if (o.circles?.length && o.origin) {
    p.set("gpx", `${o.origin}/api/kreise?c=${o.circles.map((c) => `${c.lat},${c.lon},${c.r}`).join(";")}`);
    p.set("gpxlinecolor", "5340f2");
    p.set("gpxlinethickness", "9");
    p.set("gpxlineopacity", "0.33");
  }
  return `https://www.stay22.com/embed/gm?${p}`;
}

/** Höchstpreis pro Nacht (EUR) aus dem Budget im Profil (1 = bis ca. 30 €, 2 = 30–80 €, 3 = egal), solange keiner gewählt ist */
export const maxPriceFor = (band: number | null | undefined) => (band === 1 ? 30 : band === 2 ? 80 : null);
