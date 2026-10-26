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

  function click() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    startTransition(async () => {
      if ("vibrate" in navigator) navigator.vibrate(10);
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
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
          saved ? "bg-sun text-white" : "bg-tan text-ink"
        }`}
      >
        <Icon name="heart" size={21} fill={saved ? "#ffffff" : "transparent"} className={saved ? "heart-pop" : ""} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={saved}
      className={`press flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-extrabold ${saved ? "bg-peach text-sun-soft" : "bg-tan"}`}
    >
      <Icon name="heart" size={18} fill={saved ? "var(--color-sun)" : undefined} className={saved ? "heart-pop" : ""} />
      {saved ? "Gemerkt" : "Merken"}
    </button>
  );
}
