// Geschätzte Preisklasse einer Unterkunft aus Art und Sternen (OpenStreetMap). Keine echten Preise.
import type { PriceBand } from "@/lib/profile";

export function priceClass(kind: string, stars = 0): PriceBand | null {
  if (kind === "hostel") return 1;
  if (kind === "guest_house") return stars >= 3 ? 2 : 1;
  if (kind === "apartment") return 2;
  if (kind === "hotel") {
    if (!stars) return null; // ohne Sterne wissen wir es nicht
    if (stars <= 2) return 1;
    if (stars <= 3.5) return 2;
    return 3;
  }
  return null;
}

export const PRICE_LABEL: Record<PriceBand, string> = { 1: "€", 2: "€€", 3: "€€€" };
export const BAND_TEXT: Record<PriceBand, string> = { 1: "Bis ca. 30 €", 2: "30 bis 80 €", 3: "Mehr ist okay" };

/** Passt die Unterkunft ins Budget? null = unbekannt */
export function inBudget(band: PriceBand | null | undefined, cls: PriceBand | null): boolean | null {
  if (!band || !cls) return null;
  return cls <= band;
}
