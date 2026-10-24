"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/actions";
import Icon from "@/components/Icon";

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
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition active:scale-95 ${
        fav ? "bg-sun text-white" : "bg-black/35 text-ink backdrop-blur"
      }`}
    >
      <Icon name="heart" size={16} fill={fav ? "#ffffff" : "transparent"} />
      {fav ? "Gemerkt" : "Merken"}
    </button>
  );
}
