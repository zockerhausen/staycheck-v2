"use client";

import { useOptimistic, useState, useTransition } from "react";
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
  const [burst, setBurst] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if ("vibrate" in navigator) navigator.vibrate(fav ? 8 : [10, 30, 14]);
          if (!fav) {
            setBurst(true);
            setTimeout(() => setBurst(false), 650);
          }
          setFav(!fav);
          await toggleFavorite(districtId, fav);
        })
      }
      aria-pressed={fav}
      aria-label={fav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition active:scale-95 ${burst ? "heart-burst" : ""} ${
        fav ? "bg-sun text-white" : "bg-sand/85 text-ink shadow-soft backdrop-blur"
      }`}
    >
      <Icon name="heart" size={16} fill={fav ? "#ffffff" : "transparent"} className={fav ? "heart-pop" : ""} />
      {fav ? "Gemerkt" : "Merken"}
    </button>
  );
}
