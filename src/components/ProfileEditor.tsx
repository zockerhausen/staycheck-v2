"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Criterion, Weights } from "@/lib/data";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import { storeProfile } from "@/app/actions";
import { EXTRAS, persona, type ExtraKey, type Extras, type TravelWith } from "@/lib/profile";

const WER: { key: TravelWith; label: string; icon: "user" | "heart" | "users" | "briefcase" }[] = [
  { key: "allein", label: "Allein", icon: "user" },
  { key: "paar", label: "Zu zweit", icon: "heart" },
  { key: "freunde", label: "Mit Freunden", icon: "users" },
  { key: "business", label: "Geschäftlich", icon: "briefcase" },
];

const LEVELS = ["egal", "kaum", "etwas", "wichtig", "sehr wichtig", "unverzichtbar"];

export default function ProfileEditor({
  criteria,
  initial,
  initialExtras,
}: {
  criteria: Criterion[];
  initial: Weights;
  initialExtras: Extras;
}) {
  const router = useRouter();
  const [weights, setWeights] = useState<Weights>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [wer, setWer] = useState<TravelWith | null>(initialExtras.wer);
  const [items, setItems] = useState<ExtraKey[]>(initialExtras.items);
  const [must, setMust] = useState<ExtraKey | null>(initialExtras.must);
  const changed =
    criteria.some((c) => weights[c.key] !== initial[c.key]) ||
    wer !== initialExtras.wer ||
    must !== initialExtras.must ||
    items.join() !== initialExtras.items.join();
  const p = persona(weights, { wer, items, must });

  // antippen = wichtig, nochmal = Muss, drittes Mal = weg
  function toggleExtra(k: ExtraKey) {
    setSaved(false);
    if (must === k) {
      setMust(null);
      setItems((x) => x.filter((i) => i !== k));
    } else if (items.includes(k)) setMust(k);
    else setItems((x) => [...x, k]);
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="glow-card flex items-center gap-4 rounded-3xl p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-peach text-sun-soft">
          <Icon name={p.icon} size={28} />
        </span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.08em] text-[#ffb08f]">Dein Reise-Typ</span>
          <span className="block font-display text-xl font-extrabold leading-tight">{p.name}</span>
          <span className="mt-0.5 block text-[13px] text-muted">{p.text}</span>
        </span>
      </div>

      <section className="rounded-2xl bg-paper p-4">
        <p className="mb-3 font-semibold">Mit wem bist du unterwegs?</p>
        <div className="flex flex-wrap gap-2">
          {WER.map((w) => (
            <button
              key={w.key}
              type="button"
              aria-pressed={wer === w.key}
              onClick={() => {
                setSaved(false);
                setWer(wer === w.key ? null : w.key);
              }}
              className={`press flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold ${wer === w.key ? "bg-ink text-sand" : "bg-tan"}`}
            >
              <Icon name={w.icon} size={16} /> {w.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-paper p-4">
        <p className="font-semibold">In Laufweite wichtig</p>
        <p className="mb-3 mt-0.5 text-[13px] text-muted">Antippen = wichtig, nochmal = echtes Muss.</p>
        <div className="flex flex-wrap gap-2">
          {EXTRAS.map((e) => {
            const state = must === e.key ? "must" : items.includes(e.key) ? "on" : "off";
            return (
              <button
                key={e.key}
                type="button"
                aria-pressed={state !== "off"}
                onClick={() => toggleExtra(e.key)}
                className={`press flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2.5 text-sm font-semibold ${
                  state === "must" ? "border-sun bg-sun text-white" : state === "on" ? "border-sun bg-[#24140d] text-sun-soft" : "border-tan bg-tan"
                }`}
              >
                <Icon name={state === "must" ? "flag" : e.icon} size={16} /> {state === "must" ? `Muss: ${e.label}` : e.label}
              </button>
            );
          })}
        </div>
      </section>

      {criteria.map((c) => {
        const v = weights[c.key] ?? 0;
        return (
          <label key={c.key} className="block rounded-2xl bg-paper p-4">
            <span className="flex items-center gap-3">
              <Icon name={CRITERION_ICON[c.key]} size={22} />
              <span className="flex-1 font-semibold">{c.label}</span>
              <span className={`text-sm font-semibold ${v === 0 ? "text-faint" : "text-muted"}`}>{LEVELS[v]}</span>
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
            await storeProfile(weights, undefined, { wer, items, must });
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
