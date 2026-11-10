"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { CRITERION_ICON } from "@/lib/icons";
import { persona, type Extras, type Weights } from "@/lib/profile";
import { LEVELS, topOf, TUNE_KEYS, TUNE_LABEL } from "@/lib/travel-types";
import { storeProfile } from "@/app/actions";

/**
 * Nachjustieren direkt über der Karte: kurzes Briefing (was am meisten zählt) und Regler.
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

  const top = topOf(w);
  return (
    <section className="glass-card mt-[18px] !rounded-[24px] p-4" aria-label="Reise-Profil anpassen">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${p ? "bg-peach text-sun-soft" : "shadow-primary bg-sun text-white"}`}>
          <Icon name={p ? p.icon : "discover"} size={22} fill={p ? undefined : "transparent"} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[13px] font-semibold text-muted">{p ? "Dein Reise-Profil" : "Noch ohne Profil"}</span>
          <b className="block text-[17px] font-extrabold tracking-[-0.025em] [overflow-wrap:anywhere]">{p ? p.name : "Beste Ecken für die meisten"}</b>
        </span>
      </div>

      {/* Kurz-Briefing: was gerade am meisten zählt */}
      <p className="mt-3 text-[14.5px] leading-snug text-muted">
        {top.length ? (
          <>
            Am meisten zählt{p ? " bei dir" : ""}: <b className="text-ink">{top.join(", ")}</b>.
          </>
        ) : (
          "Gerade zählt alles etwa gleich viel."
        )}{" "}
        Passt nicht ganz? Stell es mit den Reglern genau ein.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`press flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-3 text-[15px] font-extrabold ${open ? "bg-ink text-sand" : "shadow-primary bg-sun text-white"}`}
        >
          <Icon name={open ? "close" : "sliders"} size={17} /> {open ? "Regler schließen" : "Regler anpassen"}
        </button>
        <Link href={quizHref} className="press flex shrink-0 items-center rounded-full bg-peach px-4 py-3 text-[14px] font-extrabold text-sun-soft">
          {p ? "Typ wechseln" : "Typ wählen"}
        </Link>
      </div>

      {open && (
        <div className="fade-up mt-3.5 space-y-1.5">
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

      {(pending || note) && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted" role="status" aria-live="polite">
          {pending ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-sun" /> Karte und Liste werden neu sortiert …
            </>
          ) : (
            <>
              <Icon name="check" size={13} className="shrink-0 text-good" /> {note} Karte und Liste sind neu sortiert.
            </>
          )}
        </p>
      )}
    </section>
  );
}
