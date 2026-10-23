"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Criterion, Weights } from "@/lib/data";
import { savePreferences } from "@/app/actions";

const LEVELS = ["egal", "kaum", "etwas", "wichtig", "sehr wichtig", "unverzichtbar"];

export default function PreferenceForm({
  criteria,
  initial,
  loggedIn,
}: {
  criteria: Criterion[];
  initial: Weights;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [weights, setWeights] = useState<Weights>(() =>
    Object.fromEntries(criteria.map((c) => [c.key, initial[c.key] ?? 3])),
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (loggedIn) await savePreferences(weights);
      const query = new URLSearchParams(
        Object.entries(weights).map(([k, v]) => [k, String(v)]),
      ).toString();
      router.push(`/ergebnisse?${query}`);
    });
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-3">
      {criteria.map((c) => {
        const value = weights[c.key];
        return (
          <label key={c.key} className="block rounded-2xl border border-line bg-paper p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{c.label}</span>
              <span className={`text-sm ${value === 0 ? "text-muted" : "font-medium text-pine"}`}>
                {LEVELS[value]}
              </span>
            </div>
            {c.description && <p className="text-sm text-muted">{c.description}</p>}
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={value}
              onChange={(e) => setWeights((w) => ({ ...w, [c.key]: Number(e.target.value) }))}
              className="mt-3 w-full"
              aria-label={c.label}
            />
          </label>
        );
      })}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-full bg-pine px-6 py-3.5 font-medium text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending ? "Berechne…" : "Passende Kieze anzeigen"}
      </button>
    </form>
  );
}
