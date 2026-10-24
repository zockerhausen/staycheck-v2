"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QUIZ } from "@/lib/quiz";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import { storeProfile } from "@/app/actions";

function buzz() {
  // Kurzes Vibrieren (funktioniert auf Android, iPhone ignoriert es)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
}

/** Das Quiz. Am Ende wird das Reise-Profil gespeichert, damit man es nur einmal machen muss. */
export default function QuizClient({ city, cityName }: { city: string; cityName: string }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [step, setStep] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<number | null>(null);

  const q = QUIZ[step];
  const progress = (step / QUIZ.length) * 100;

  function choose(index: number) {
    if (picked !== null) return;
    buzz();
    setPicked(index);
    const next = { ...weights, [q.key]: q.answers[index].weight };
    setWeights(next);

    setTimeout(() => {
      if (step + 1 < QUIZ.length) {
        setStep(step + 1);
        setPicked(null);
      } else {
        startSaving(async () => {
          await storeProfile(next, city);
          router.push(`/ergebnis?stadt=${city}&neu=1`);
        });
      }
    }, 280);
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (step === 0) return router.push("/reise");
            setStep(step - 1);
            setPicked(null);
          }}
          className="text-2xl text-muted"
          aria-label="Zurück"
        >
          <Icon name="back" size={26} />
        </button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-tan">
          <div
            className="h-full rounded-full bg-sun transition-all duration-300"
            style={{ width: `${Math.max(progress, 6)}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-muted tabular-nums">
          {step + 1}/{QUIZ.length}
        </span>
      </div>

      <p className="mt-8 text-sm font-semibold text-peach-ink">Dein Reise-Profil · Ziel: {cityName}</p>
      <h1 key={q.key} className="pop-in mt-2 font-display text-3xl font-extrabold leading-tight">
        {q.question}
      </h1>

      <div key={`a-${q.key}`} className="mt-8 space-y-3">
        {q.answers.map((a, i) => (
          <button
            key={a.text}
            type="button"
            className="tile pop-in"
            style={{ animationDelay: `${i * 60}ms` }}
            data-selected={picked === i}
            onClick={() => choose(i)}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                a.weight >= 4 ? "bg-sun text-white" : a.weight >= 2 ? "bg-peach text-sun" : "bg-tan text-muted"
              }`}
            >
              <Icon name={CRITERION_ICON[q.key]} size={30} fill={a.weight >= 4 ? "#ffffff55" : "#ffffff"} />
            </span>
            <span className="text-lg font-semibold">{a.text}</span>
          </button>
        ))}
      </div>

      <p className="mt-auto pt-8 text-center text-sm text-muted">
        {saving ? "Wir suchen deine Kieze …" : "Du machst das Quiz nur einmal. Später kannst du dein Profil jederzeit anpassen."}
      </p>
      <Link href="/reise" className="pt-3 text-center text-sm font-semibold text-muted">
        Abbrechen
      </Link>
    </div>
  );
}
