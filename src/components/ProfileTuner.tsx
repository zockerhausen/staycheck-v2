"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { CRITERION_ICON } from "@/lib/icons";
import { persona, type Extras, type Weights } from "@/lib/profile";
import { LEVELS, TUNE_KEYS, TUNE_LABEL, TUNE_MORE } from "@/lib/travel-types";
import { storeProfile } from "@/app/actions";

/**
 * Nachjustieren direkt über der Karte: Schnell-Knöpfe („Ruhiger“, „Mehr Nachtleben“ …) und Regler.
 * Jede Änderung wird gespeichert und Karte und Liste darunter sortieren sich neu, man sieht sofort, was sie bewirkt.
 * Ohne Profil zeigt die Seite die besten Ecken für die meisten Reisenden; der erste Tipp macht daraus ein eigenes Profil.
 */
export default function ProfileTuner({
  weights,
  base,
  extras,
  quizHref,
}: {
  weights: Weights | null;
  /** Startwerte ohne eigenes Profil */
  base: Weights;
  extras: Extras;
  quizHref: string;
}) {
  const router = useRouter();
  const [w, setW] = useState<Weights>(weights ?? base);
  const [own, setOwn] = useState(Boolean(weights));
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => () => clearTimeout(timer.current), []);

  function change(key: string, value: number) {
    const v = Math.min(5, Math.max(0, value));
    if (v === (w[key] ?? 0)) return;
    const next = { ...w, [key]: v };
    setW(next);
    setOwn(true);
    setNote(`${TUNE_LABEL[key]} zählt jetzt: ${LEVELS[v]}.`);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(6);
    // Kurz warten (Regler wird noch bewegt), dann speichern und die Seite darunter neu sortieren. Der Reihe nach, damit der letzte Stand gewinnt.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        queue.current = queue.current.then(() => storeProfile(next)).catch(() => undefined);
        await queue.current;
        router.refresh();
      });
    }, 450);
  }

  const p = own ? persona(w, extras) : null;

  return (
    <section className="glass-card mt-[18px] !rounded-[24px] px-3.5 py-3" aria-label="Reise-Profil anpassen">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${p ? "bg-peach text-sun-soft" : "shadow-primary bg-sun text-white"}`}>
          <Icon name={p ? p.icon : "discover"} size={21} fill={p ? undefined : "transparent"} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[13px] font-semibold text-muted">{p ? "Dein Reise-Profil" : "Ohne Profil"}</span>
          <b className={`block text-[16.5px] font-extrabold tracking-[-0.025em] ${p ? "truncate" : ""}`}>{p ? p.name : "Beste Ecken"}</b>
        </span>
        <Link href={quizHref} className="press shrink-0 rounded-full bg-peach px-3 py-2 text-[13px] font-extrabold text-sun-soft">
          {p ? "Typ wechseln" : "Typ wählen"}
        </Link>
      </div>

      {/* Schnell-Knöpfe: einmal tippen = eine Stufe wichtiger */}
      <div className="-mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[13.5px] font-extrabold ${open ? "bg-ink text-sand" : "bg-sun text-white"}`}
        >
          <Icon name={open ? "close" : "sliders"} size={15} /> Regler
        </button>
        {TUNE_KEYS.map((k) => {
          const max = (w[k] ?? 0) >= 5;
          return (
            <button
              key={k}
              type="button"
              disabled={max}
              onClick={() => change(k, (w[k] ?? 0) + 1)}
              className="press flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-tan px-3.5 py-2.5 text-[13.5px] font-bold disabled:opacity-45"
            >
              <Icon name={CRITERION_ICON[k]} size={15} /> {max ? `${TUNE_LABEL[k]}: voll` : TUNE_MORE[k]}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fade-up mt-3 space-y-1">
          {TUNE_KEYS.map((k) => {
            const v = w[k] ?? 0;
            return (
              <label key={k} className="flex items-center gap-2.5 py-1">
                <Icon name={CRITERION_ICON[k]} size={18} className="shrink-0 text-sun-soft" />
                <span className="w-[76px] shrink-0 text-[14px] font-bold">{TUNE_LABEL[k]}</span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={v}
                  aria-label={TUNE_LABEL[k]}
                  aria-valuetext={LEVELS[v]}
                  onChange={(e) => change(k, Number(e.target.value))}
                  className="min-w-0 flex-1"
                />
                <span className={`w-[86px] shrink-0 text-right text-[12.5px] font-bold ${v === 0 ? "text-faint" : "text-muted"}`}>{LEVELS[v]}</span>
              </label>
            );
          })}
          <Link href="/profil" className="flex items-center gap-1 pt-1.5 text-[13px] font-bold text-sun-soft">
            Sicherheit, No-Gos und Extras einstellen <Icon name="chevron" size={13} />
          </Link>
        </div>
      )}

      <p className="mt-2.5 flex min-h-[18px] items-center gap-1.5 text-[12.5px] font-semibold text-muted" role="status" aria-live="polite">
        {pending ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-sun" /> Karte und Liste werden neu sortiert …
          </>
        ) : note ? (
          <>
            <Icon name="check" size={13} className="shrink-0 text-good" /> {note} Karte und Liste sind neu sortiert.
          </>
        ) : (
          "Tippe an, was dir wichtiger ist. Karte und Liste sortieren sich sofort neu."
        )}
      </p>
    </section>
  );
}
