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
          setFav(!fav);
          await toggleFavorite(districtId, fav);
        })
      }
      aria-pressed={fav}
      aria-label={fav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        fav ? "border-coral bg-coral text-white" : "border-line hover:border-coral hover:text-coral"
      }`}
    >
      {fav ? "♥ Gemerkt" : "♡ Merken"}
    </button>
  );
}
