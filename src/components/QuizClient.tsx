"use client";

import { canGoBack } from "@/components/BackButton";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NOGOS, type Extras, type NoGo, type PriceBand } from "@/lib/profile";
import { TRAVEL_TYPES, topOf, withBudget } from "@/lib/travel-types";
import { BAND_TEXT } from "@/lib/price";
import Icon from "@/components/Icon";
import { storeProfile } from "@/app/actions";

function buzz(ms: number | number[] = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

/**
 * Reise-Profil in zwei Schritten: 1) Reisetyp antippen, 2) Budget und No-Gos. Danach direkt das Ergebnis.
 * Feiner einstellen geht dort auf der Karte (Regler), wo man sofort sieht, was sich ändert.
 */
export default function QuizClient({
  city,
  cityName,
  next: nextUrl,
  initial,
}: {
  city: string;
  cityName: string;
  next?: string;
  /** Bisherige Angaben (beim Wechseln des Typs bleiben Budget und No-Gos vorgewählt) */
  initial?: Extras;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [type, setType] = useState<string | null>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [preis, setPreis] = useState<PriceBand | null>(initial?.preis ?? null);
  const [nogo, setNogo] = useState<NoGo[]>(initial?.nogo ?? []);
  const chosen = TRAVEL_TYPES.find((t) => t.key === type) ?? null;
  const home = nextUrl ?? "/";

  function back() {
    if (step === 1) return setStep(0);
    if (canGoBack()) router.back();
    else router.push("/");
  }

  function pick(key: string) {
    buzz();
    setType(key);
    setTimeout(() => setStep(1), 220);
  }

  function finish() {
    if (!chosen) return;
    buzz([12, 40, 18]);
    startSaving(async () => {
      await storeProfile(withBudget(chosen.weights, preis), city || undefined, {
        wer: initial?.wer ?? null,
        items: chosen.items ?? [],
        must: null,
        preis,
        nogo,
      });
      router.push(home);
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tan" aria-label="Zurück">
          <Icon name={step === 0 ? "close" : "back"} size={18} />
        </button>
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={2} aria-valuenow={step + 1}>
          {[0, 1].map((i) => (
            <span key={i} className={`h-[5px] flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-sun" : "bg-peach"}`} />
          ))}
        </div>
        <span className="shrink-0 text-[13px] font-extrabold text-muted">{step + 1} von 2</span>
      </div>

      {step === 0 ? (
        <>
          <p className="mt-7 text-[13px] font-extrabold text-muted">{cityName} · dauert 10 Sekunden</p>
          <h1 className="pop-in mega mt-2 text-[1.9rem] leading-tight">Wie reist du?</h1>
          <p className="mt-2 text-sm text-muted">Tippe an, was am ehesten passt. Fein einstellen kannst du danach direkt auf der Karte.</p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {TRAVEL_TYPES.map((t, i) => (
              <button
                key={t.key}
                type="button"
                className="tile pop-in !items-start flex-col !gap-2.5 !px-3.5 py-4"
                style={{ animationDelay: `${i * 45}ms` }}
                data-selected={type === t.key}
                aria-pressed={type === t.key}
                onClick={() => pick(t.key)}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-peach text-sun-soft">
                  <Icon name={t.icon} size={22} />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-[16px] font-extrabold leading-snug [overflow-wrap:anywhere]">{t.name}</span>
                  <span className="mt-0.5 block text-[13px] font-medium leading-snug text-muted">{t.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => router.push(home)} className="mt-auto pt-6 text-center text-sm font-semibold text-muted">
            Weiß ich nicht. Zeig mir erst mal die besten Ecken
          </button>
        </>
      ) : (
        chosen && (
          <>
            <button type="button" onClick={() => setStep(0)} className="press mt-7 flex items-center gap-3 self-start rounded-full bg-peach py-1.5 pl-1.5 pr-4 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sun text-white">
                <Icon name={chosen.icon} size={18} />
              </span>
              <span className="text-[14px] font-extrabold text-sun-soft">{chosen.name} · ändern</span>
            </button>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Bei dir zählt am meisten: <b className="text-ink">{topOf(chosen.weights).join(", ")}</b>.
            </p>

            <h1 className="pop-in mega mt-6 text-[1.6rem] leading-tight">Was darf eine Nacht kosten?</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {([1, 2, 3] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={preis === b}
                  onClick={() => {
                    buzz(6);
                    setPreis(preis === b ? null : b);
                  }}
                  className={`press rounded-full border-[1.5px] px-4 py-3 text-[15px] font-bold transition-colors ${preis === b ? "border-sun bg-sun text-white" : "border-tan bg-tan"}`}
                >
                  {BAND_TEXT[b]}
                </button>
              ))}
            </div>

            <h2 className="mega mt-8 text-[1.6rem] leading-tight">Was geht für dich gar nicht?</h2>
            <p className="mt-1.5 text-sm text-muted">Solche Ecken landen bei dir ganz unten (Match höchstens 45). Nichts davon schlimm? Einfach weiter.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {NOGOS.map((n) => {
                const on = nogo.includes(n.key);
                return (
                  <button
                    key={n.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      buzz(6);
                      setNogo((x) => (on ? x.filter((k) => k !== n.key) : [...x, n.key]));
                    }}
                    className={`press flex min-w-0 items-center gap-2 rounded-[18px] border-[1.5px] px-3 py-3 text-left text-[14px] font-bold leading-tight transition-colors ${
                      on ? "border-bad bg-bad/10 text-bad" : "border-tan bg-tan"
                    }`}
                  >
                    <Icon name={on ? "close" : n.icon} size={18} className="shrink-0" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{n.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-8">
              <button type="button" disabled={saving} onClick={finish} className="btn-chunky w-full disabled:opacity-60">
                {saving ? "Sortiere deine Ecken …" : `Meine Ecken in ${cityName} zeigen`}
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
