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
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition active:scale-95 ${
          saved ? "border-sun bg-sun text-white" : "border-line bg-paper text-ink"
        }`}
      >
        <Icon name="heart" size={20} fill={saved ? "#ffffff" : undefined} />
      </button>
    );
  }

  return (
    <button type="button" onClick={click} disabled={pending} className="btn-chunky btn-chunky-light w-full">
      <Icon name="heart" size={22} fill={saved ? "#f2662f" : undefined} />
      {saved ? "Gemerkt" : "Ort merken"}
    </button>
  );
}
