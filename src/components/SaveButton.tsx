"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveResult } from "@/app/actions";
import Icon from "@/components/Icon";

/** Erst nach dem Erfolgsmoment um ein Konto bitten. */
export default function SaveButton({
  loggedIn,
  weights,
  districtId,
  alreadySaved,
  returnTo,
}: {
  loggedIn: boolean;
  weights: Record<string, number>;
  districtId: string;
  alreadySaved: boolean;
  returnTo: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(alreadySaved);

  if (saved) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-2xl bg-peach py-3 font-semibold text-peach-ink"><Icon name="heart" size={20} fill="#f2662f" /> In deinem Konto gespeichert</p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-chunky btn-chunky-light w-full"
      onClick={() => {
        if (!loggedIn) {
          router.push(`/login?next=${encodeURIComponent(returnTo)}`);
          return;
        }
        startTransition(async () => {
          await saveResult(weights, districtId);
          if ("vibrate" in navigator) navigator.vibrate(15);
          setSaved(true);
        });
      }}
    >
      <Icon name="heart" size={22} />
      {pending ? "Speichere…" : loggedIn ? "Ergebnis speichern" : "Ergebnis speichern (kostenlos)"}
    </button>
  );
}
