// Die Unterkunfts-Liste eines Viertels, für beide Seiten gleich (Kiez und Spot):
// echte Daten zusammenführen (Lage von uns, Note und Preis nur wenn echt), Budget, Filter, „drin / knapp daneben“, Stärken.
import type { HotelResult } from "./geo";
import type { GoodArea } from "./good-area";
import { inBudget, PRICE_LABEL, priceClass } from "./price";
import { classCap } from "./trip";
import { combine, type StayReviews, stayKey, TOP_FAIR, type PlatformRating } from "./reviews";
import { matchLive, type LiveStay } from "./stay22-api";
import type { Weights } from "./profile";

export const KIND_LABEL: Record<string, string> = { hotel: "Hotel", hostel: "Hostel", guest_house: "Pension", apartment: "Apartment", motel: "Motel" };
export const STAY_FILTERS = [
  { key: "alle", label: "Alle" },
  { key: "top", label: "Top bewertet" },
  { key: "hostel", label: "Hostels" },
  { key: "hotel", label: "Hotels" },
  { key: "guest_house", label: "Pensionen" },
  { key: "apartment", label: "Apartments" },
] as const;

// Kurze Namen für die Stärken-Balken
const SHORT: Record<string, string> = {
  transit: "Anbindung",
  nightlife: "Nachtleben",
  food: "Essen",
  nature: "Grün",
  quiet: "Ruhe",
  budget: "Günstig",
  safety: "Sicherheit",
  supermarkt: "Supermarkt",
  cafe: "Cafés",
  sehenswert: "Sehenswert",
  waschsalon: "Waschsalon",
  fitness: "Fitness",
  strand: "Strand",
};

export type StayItem = {
  key: string;
  hotel: HotelResult;
  name: string;
  lat: number;
  lon: number;
  kind: string;
  kindLabel: string;
  match: number;
  out: boolean;
  /** Echter Preis pro Nacht (Stay22) oder geschätzte Preisklasse */
  price: { text: string; live: boolean } | null;
  /** Nur echte Bewertungen */
  reviews: StayReviews | null;
  /** Die drei Stärken, die dir am wichtigsten sind (0–10) */
  bars: { label: string; value: number }[];
  note: string;
  /** Link genau zu dieser Unterkunft (echter Stay22-Link, sonst Suche per Name) */
  booking?: string;
};

export function buildStayList(o: {
  hotels: HotelResult[];
  weights: Weights;
  good: GoodArea | null;
  maxNight: number | null;
  filter: string;
  rev: Map<string, StayReviews>;
  live: LiveStay[] | null;
  booking: (h: HotelResult) => string | undefined;
}) {
  const cap = classCap(o.maxNight);
  // Echte Daten an unsere Einträge hängen
  const all = o.hotels.map((h) => {
    const live = o.live?.length ? matchLive(h, o.live) : null;
    const ratings: PlatformRating[] = [...(o.rev.get(stayKey(h))?.platforms ?? [])];
    if (live?.rating && live.count) ratings.push({ platform: "stay22", raw: live.rating, score: live.rating, count: live.count });
    const reviews = ratings.length ? combine(ratings, o.rev.get(stayKey(h))?.snippets ?? [], false) : null;
    const cls = priceClass(h.kind, h.stars ?? live?.stars ?? 0);
    // Budget: echter Preis schlägt Schätzung
    const fits = live?.nightly != null ? (o.maxNight ? live.nightly <= o.maxNight : true) : o.maxNight ? inBudget(cap, cls) : true;
    const bars = Object.entries(o.weights)
      .filter(([k, w]) => w > 0 && h.scores[k] !== null && h.scores[k] !== undefined && SHORT[k])
      .sort((a, b) => b[1] - a[1] || (h.scores[b[0]] ?? 0) - (h.scores[a[0]] ?? 0))
      .slice(0, 3)
      .map(([k]) => ({ label: SHORT[k], value: Math.round((h.scores[k] as number) * 10) / 10 }));
    const item: StayItem = {
      key: stayKey(h),
      hotel: h,
      name: h.name,
      lat: h.lat,
      lon: h.lon,
      kind: h.kind,
      kindLabel: KIND_LABEL[h.kind] ?? "Unterkunft",
      match: h.match,
      out: o.good ? !o.good.inside(h.lat, h.lon) : false,
      price: live?.nightly != null ? { text: `ca. ${live.nightly} € / Nacht`, live: true } : cls ? { text: PRICE_LABEL[cls], live: false } : null,
      reviews,
      bars,
      note: h.highlights[0]?.text ?? "",
      booking: live?.link ?? o.booking(h),
    };
    return { item, fits };
  });
  const inBudgetAll = all.filter((x) => x.fits === true).map((x) => x.item);
  const hiddenUnknown = o.maxNight ? all.filter((x) => x.fits === null).length : 0;
  const counts: Record<string, number> = { alle: inBudgetAll.length, top: inBudgetAll.filter((i) => (i.reviews?.fair ?? 0) >= TOP_FAIR).length };
  for (const i of inBudgetAll) counts[i.kind] = (counts[i.kind] ?? 0) + 1;
  const byType =
    o.filter === "alle" ? inBudgetAll : o.filter === "top" ? inBudgetAll.filter((i) => (i.reviews?.fair ?? 0) >= TOP_FAIR) : inBudgetAll.filter((i) => i.kind === o.filter);
  // Erst drin (nach Lage), dann knapp daneben
  const items = [...byType.filter((i) => !i.out), ...byType.filter((i) => i.out)];
  const anyReviews = all.some((x) => x.item.reviews);
  return { items, counts, hiddenUnknown, anyReviews };
}
