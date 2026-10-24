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
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tan"
          aria-label="Zurück"
        >
          <Icon name={step === 0 ? "close" : "back"} size={18} />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tan">
          <div
            className="h-full rounded-full bg-sun transition-all duration-300"
            style={{ width: `${Math.max(progress, 6)}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-muted tabular-nums">
          {step + 1}/{QUIZ.length}
        </span>
      </div>

      <span key={`i-${q.key}`} className="pop-in mt-8 flex h-16 w-16 items-center justify-center rounded-[20px] bg-peach text-sun-soft">
        <Icon name={CRITERION_ICON[q.key]} size={34} />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.08em] text-muted">Reise-Profil · Ziel: {cityName}</p>
      <h1 key={q.key} className="pop-in mega mt-2 text-[1.9rem] leading-tight">
        {q.question}
      </h1>

      <div key={`a-${q.key}`} className="mt-8 space-y-3">
        {q.answers.map((a, i) => (
          <button
            key={a.text}
            type="button"
            className="tile pop-in py-5"
            style={{ animationDelay: `${i * 60}ms` }}
            data-selected={picked === i}
            onClick={() => choose(i)}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] ${
                picked === i ? "border-sun bg-sun text-white" : "border-raised text-muted"
              }`}
            >
              {"ABC"[i]}
            </span>
            <span className="text-[17px] font-bold">{a.text}</span>
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
