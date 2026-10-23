"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveResult } from "@/app/actions";

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
      <p className="rounded-2xl bg-peach py-3 text-center font-semibold text-peach-ink">♥ In deinem Konto gespeichert</p>
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
      {pending ? "Speichere…" : loggedIn ? "♡ Ergebnis speichern" : "♡ Ergebnis speichern (kostenloses Konto)"}
    </button>
  );
}
