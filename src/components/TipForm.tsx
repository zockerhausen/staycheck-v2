"use client";

import { useState, useTransition } from "react";
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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-line bg-paper py-3 text-sm font-bold"
      >
        <Icon name="tip" size={18} /> Tipp schreiben
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-3 rounded-2xl border-2 border-line bg-paper p-4"
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
              className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-bold ${
                category === c.key ? "border-sun bg-sun text-white" : "border-line bg-white"
              }`}
            >
              <Icon name={c.icon} size={16} fill={category === c.key ? "#ffffff55" : undefined} /> {c.label}
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
          className="mt-1 w-full rounded-xl border-2 border-line bg-white p-3 outline-none focus:border-sun"
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
