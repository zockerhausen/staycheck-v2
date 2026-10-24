"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Criterion, Weights } from "@/lib/data";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import { storeProfile } from "@/app/actions";

const LEVELS = ["egal", "kaum", "etwas", "wichtig", "sehr wichtig", "unverzichtbar"];

export default function ProfileEditor({ criteria, initial }: { criteria: Criterion[]; initial: Weights }) {
  const router = useRouter();
  const [weights, setWeights] = useState<Weights>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const changed = criteria.some((c) => weights[c.key] !== initial[c.key]);

  return (
    <div className="mt-6 space-y-3">
      {criteria.map((c) => {
        const v = weights[c.key] ?? 0;
        return (
          <label key={c.key} className="block rounded-2xl border-2 border-line bg-paper p-4">
            <span className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${v >= 4 ? "bg-sun text-white" : v >= 2 ? "bg-peach text-sun" : "bg-tan text-muted"}`}>
                <Icon name={CRITERION_ICON[c.key]} size={24} fill={v >= 4 ? "#ffffff55" : "#ffffff"} />
              </span>
              <span className="flex-1 font-semibold">{c.label}</span>
              <span className={`text-sm font-semibold ${v === 0 ? "text-muted" : "text-sun"}`}>{LEVELS[v]}</span>
            </span>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={v}
              aria-label={c.label}
              onChange={(e) => {
                setSaved(false);
                setWeights((w) => ({ ...w, [c.key]: Number(e.target.value) }));
              }}
              className="mt-3 w-full"
            />
          </label>
        );
      })}

      <button
        type="button"
        disabled={pending || !changed}
        onClick={() =>
          startTransition(async () => {
            await storeProfile(weights);
            if ("vibrate" in navigator) navigator.vibrate(15);
            setSaved(true);
            router.refresh();
          })
        }
        className="btn-chunky mt-2 w-full disabled:opacity-60"
      >
        {pending ? "Speichere …" : saved ? "Gespeichert" : "Profil speichern"}
      </button>
      <Link href="/quiz" className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-muted">
        <Icon name="refresh" size={16} /> Lieber das Quiz nochmal machen
      </Link>
    </div>
  );
}
