"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/actions";

export default function FavoriteButton({
  districtId,
  isFavorite,
}: {
  districtId: string;
  isFavorite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [fav, setFav] = useOptimistic(isFavorite);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if ("vibrate" in navigator) navigator.vibrate(10);
          setFav(!fav);
          await toggleFavorite(districtId, fav);
        })
      }
      aria-pressed={fav}
      aria-label={fav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition active:scale-95 ${
        fav ? "border-sun bg-sun text-white" : "border-line bg-paper text-ink"
      }`}
    >
      {fav ? "♥ Gemerkt" : "♡ Merken"}
    </button>
  );
}
