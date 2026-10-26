import type { IconName } from "@/lib/icons";

// Teile, die auch im Browser genutzt werden (ohne Datenbank-Zugriff)
export type Tip = {
  id: string;
  author_name: string | null;
  place_name: string | null;
  category: TipCategory;
  body: string;
  created_at: string;
};

export type TipCategory = "laerm" | "sicherheit" | "anbindung" | "essen" | "unterkunft" | "sonstiges";

export const TIP_CATEGORIES: { key: TipCategory; label: string; icon: IconName }[] = [
  { key: "laerm", label: "Lärm", icon: "quiet" },
  { key: "sicherheit", label: "Sicherheit", icon: "safety" },
  { key: "anbindung", label: "Anbindung", icon: "transit" },
  { key: "essen", label: "Essen", icon: "food" },
  { key: "unterkunft", label: "Unterkunft", icon: "hotel" },
  { key: "sonstiges", label: "Sonstiges", icon: "tip" },
];

export function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "heute";
  if (days < 2) return "gestern";
  if (days < 31) return `vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  return months < 12 ? `vor ${months} Monat${months > 1 ? "en" : ""}` : `vor ${Math.floor(months / 12)} Jahr(en)`;
}
