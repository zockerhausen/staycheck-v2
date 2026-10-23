"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QUIZ } from "@/lib/quiz";

function buzz() {
  // Kurzes Vibrieren (funktioniert auf Android, iPhone ignoriert es)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
}

export default function QuizPage() {
  const router = useRouter();
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
        const query = new URLSearchParams(
          Object.entries(next).map(([k, v]) => [k, String(v)]),
        ).toString();
        router.push(`/ergebnis?${query}&neu=1`);
      }
    }, 280);
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (step === 0) return router.push("/");
            setStep(step - 1);
            setPicked(null);
          }}
          className="text-2xl text-muted"
          aria-label="Zurück"
        >
          ←
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

      <h1 key={q.key} className="pop-in mt-10 font-display text-3xl font-extrabold leading-tight">
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
            <span className="text-3xl" aria-hidden>
              {a.emoji}
            </span>
            <span className="text-lg font-semibold">{a.text}</span>
          </button>
        ))}
      </div>

      <Link href="/" className="mt-auto pt-8 text-center text-sm text-muted">
        Abbrechen
      </Link>
    </div>
  );
}
