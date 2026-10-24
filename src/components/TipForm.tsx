"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { addTip } from "@/app/actions";
import { TIP_CATEGORIES } from "@/lib/tips-shared";

export default function TipForm({
  lat,
  lon,
  placeName,
  districtId,
  returnTo,
}: {
  lat: number;
  lon: number;
  placeName?: string;
  districtId: string | null;
  returnTo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <p className="mt-3 rounded-2xl bg-peach p-3 text-sm font-semibold text-peach-ink">Danke! Dein Tipp ist online.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-paper py-3 text-sm font-bold"
      >
        <Icon name="tip" size={18} /> Tipp schreiben
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-3 rounded-2xl bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!category) return setError("Wähl eine Kategorie.");
        if (body.trim().length < 10) return setError("Schreib bitte mindestens 10 Zeichen.");
        startTransition(async () => {
          const err = await addTip({ lat, lon, placeName, districtId, category, body }, returnTo);
          if (err) setError(err);
          else {
            if ("vibrate" in navigator) navigator.vibrate(15);
            setDone(true);
            router.refresh(); // neuen Tipp anzeigen
          }
        });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Worum geht es?</legend>
        <div className="flex flex-wrap gap-2">
          {TIP_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setCategory(c.key);
                setError("");
              }}
              aria-pressed={category === c.key}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ${
                category === c.key ? "bg-ink text-sand" : "bg-tan"
              }`}
            >
              <Icon name={c.icon} size={16}  /> {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm font-semibold">Dein Tipp</span>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value.slice(0, 280));
            setError("");
          }}
          rows={3}
          placeholder="z. B. Zimmer zur Straße sind laut, nach hinten raus ist es ruhig."
          className="mt-1 w-full rounded-2xl border border-line bg-tan p-3.5 outline-none focus:border-sun"
        />
        <span className="block text-right text-xs text-muted">{body.length}/280</span>
      </label>
      {error && <p className="text-sm font-semibold text-peach-ink">{error}</p>}
      <button disabled={pending} className="btn-chunky w-full">
        {pending ? "Wird gespeichert …" : "Tipp veröffentlichen"}
      </button>
      <p className="text-xs text-muted">
        Keine Namen, Telefonnummern oder Beleidigungen. Tipps, die mehrfach gemeldet werden, blenden wir aus.
      </p>
    </form>
  );
}
