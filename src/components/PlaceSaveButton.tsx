"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { togglePlace, type PlaceInput } from "@/app/actions";

export default function PlaceSaveButton({
  place,
  initiallySaved,
  loggedIn,
  returnTo,
  compact = false,
}: {
  place: PlaceInput;
  initiallySaved: boolean;
  loggedIn: boolean;
  returnTo: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const [burst, setBurst] = useState(false);

  function click() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    startTransition(async () => {
      if ("vibrate" in navigator) navigator.vibrate(saved ? 8 : [10, 30, 14]);
      if (!saved) {
        setBurst(true);
        setTimeout(() => setBurst(false), 650);
      }
      setSaved(!saved);
      setSaved(await togglePlace(place, saved));
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Nicht mehr merken" : "Merken"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${burst ? "heart-burst" : ""} ${
          saved ? "bg-sun text-white" : "bg-paper text-sun-soft shadow-[inset_0_0_0_2px_var(--color-raised)]"
        }`}
      >
        <Icon name="heart" size={20} fill={saved ? "#ffffff" : "transparent"} className={saved ? "heart-pop" : ""} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={saved}
      className={`press flex min-h-[3.85rem] w-full items-center justify-center gap-2 rounded-full font-extrabold ${burst ? "heart-burst" : ""} ${saved ? "bg-sun text-white" : "bg-peach text-sun-soft"}`}
    >
      <Icon name="heart" size={19} fill={saved ? "var(--color-pink)" : "transparent"} className={saved ? "heart-pop" : ""} />
      {saved ? "Gemerkt" : "Merken"}
    </button>
  );
}
