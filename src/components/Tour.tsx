"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

export const TOUR_KEY = "sc-tour"; // "done" = gesehen, "again" = bitte nochmal zeigen

type Step = {
  /** Echtes Element auf der Seite, auf das gezeigt wird. Fehlt es, wird der Schritt ausgelassen. */
  sel: string;
  label: string;
  title: string;
  text: string;
  radius?: number;
  pad?: number;
};

const STEPS: Step[] = [
  {
    sel: '[data-tour="profil"]',
    label: "Zuerst",
    title: "Sag, wie du reist.",
    text: "Wähl deinen Reisetyp oder stell mit den Reglern ein, was dir wichtig ist. Danach richtet sich alles in der App.",
    radius: 26,
  },
  {
    sel: "#karte",
    label: "Dann",
    title: "Hier leuchten deine Ecken.",
    text: "Violett leuchtet, wo es in der Stadt am besten zu dir passt. Kleine Gegenden statt ganzer Bezirke.",
    radius: 22,
    pad: -6,
  },
  {
    sel: '#ecken [id^="kiez-"]',
    label: "Dann",
    title: "Tippe eine Ecke an.",
    text: "Du siehst alle Unterkünfte dort auf einer Karte, jede mit einer Lage-Zahl von 0 bis 100.",
    radius: 28,
  },
  {
    sel: 'nav a[href="/check"]',
    label: "Schon gebucht?",
    title: "Prüf die Lage.",
    text: "Gib Name oder Adresse deiner Unterkunft ein. Wir sagen dir ehrlich, wie gut sie für dich liegt.",
    radius: 26,
    pad: 8,
  },
  {
    sel: 'nav a[href^="/duell"]',
    label: "Unentschlossen?",
    title: "Lass zwei antreten.",
    text: "Im Duell vergleichst du zwei Unterkünfte direkt miteinander.",
    radius: 20,
    pad: 8,
  },
  {
    sel: 'nav a[href="/favoriten"]',
    label: "Zum Schluss",
    title: "Merk dir, was gefällt.",
    text: "Mit dem Herz landen Ecken und Unterkünfte hier. Mehr musst du nicht wissen. Viel Spaß!",
    radius: 20,
    pad: 8,
  },
];

type Box = { top: number; left: number; width: number; height: number };
const CARD_H = 232; // geschätzte Höhe der Karte (für die Platzierung)

/**
 * Rundgang beim ersten Besuch: zeigt nacheinander auf die echten Knöpfe der Seite (alles andere wird abgedunkelt).
 * Läuft einmal von selbst und lässt sich über „Rundgang nochmal ansehen“ jederzeit neu starten (TourReplay).
 */
export default function Tour() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [vh, setVh] = useState(800);
  const cardRef = useRef<HTMLDivElement>(null);

  // Start: beim ersten Besuch (nach dem Start-Logo) oder wenn „nochmal“ gewünscht ist
  useEffect(() => {
    let state: string | null = null;
    try {
      state = localStorage.getItem(TOUR_KEY);
    } catch {
      return; // ohne Speicher käme der Rundgang bei jedem Besuch: lieber gar nicht
    }
    if (state === "done") return;
    const t = setTimeout(
      () => {
        const found = STEPS.filter((s) => document.querySelector(s.sel));
        if (found.length < 2) return;
        document.documentElement.dataset.tour = "on";
        setI(0);
        setSteps(found);
      },
      state === "again" ? 500 : 2100,
    );
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, "done");
    } catch {
      // egal
    }
    delete document.documentElement.dataset.tour;
    setSteps(null);
    setBox(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const step = steps?.[i] ?? null;

  // Zum Element fahren und seine Lage laufend nachmessen (Seite kann sich beim Scrollen noch bewegen)
  useEffect(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(step.sel);
    if (!el) return;
    const fixed = Boolean(el.closest("nav"));
    const h = window.innerHeight;
    if (!fixed) {
      const r = el.getBoundingClientRect();
      // Hohe Elemente oben anlegen (Platz für die Karte darunter), kleine in die obere Hälfte
      const want = r.height > h * 0.45 ? 84 : Math.max(84, (h - CARD_H - r.height) / 2 - 20);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - want), behavior: reduce ? "auto" : "smooth" });
    }
    let frame = 0;
    let last = "";
    const measure = () => {
      const r = el.getBoundingClientRect();
      const pad = step.pad ?? 6;
      const top = Math.max(6, r.top - pad);
      let bottom = Math.min(window.innerHeight - 6, r.bottom + pad);
      // Hohes Element auf kleinem Bildschirm: Ausschnitt kürzen, damit die Karte darunter Platz hat und nichts verdeckt
      const room = window.innerHeight - CARD_H - 30;
      if (!fixed && bottom > room && top + 110 <= room) bottom = room;
      const left = Math.max(6, r.left - pad);
      const right = Math.min(window.innerWidth - 6, r.right + pad);
      const b = { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
      const key = `${b.top | 0},${b.left | 0},${b.width | 0},${b.height | 0},${window.innerHeight}`;
      if (key !== last) {
        last = key;
        setBox(b);
        setVh(window.innerHeight);
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    cardRef.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  // Escape = überspringen
  useEffect(() => {
    if (!steps) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps, close]);

  if (!steps || !step || !box) return null;
  const last = i === steps.length - 1;
  // Karte: unter dem Element, sonst darüber, sonst unten am Rand (bei sehr hohen Elementen)
  const below = vh - (box.top + box.height);
  const cardStyle: React.CSSProperties =
    below >= CARD_H + 20 ? { top: box.top + box.height + 14 } : box.top >= CARD_H + 20 ? { bottom: vh - box.top + 14 } : { bottom: 16 };

  return createPortal(
    <div className="sc-tour" role="dialog" aria-modal="true" aria-label={`Rundgang, Schritt ${i + 1} von ${steps.length}`}>
      {/* Fängt alle Berührungen ab: während des Rundgangs wird nichts versehentlich angetippt */}
      <div className="sc-tour-block" />
      <div className="sc-tour-hole" style={{ top: box.top, left: box.left, width: box.width, height: box.height, borderRadius: step.radius ?? 20 }} />
      <button type="button" onClick={close} className="sc-tour-skip">
        Überspringen
      </button>
      <div ref={cardRef} tabIndex={-1} className="sc-tour-card outline-none" style={cardStyle}>
        <div key={i} className="fade-up">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-sun-soft">{step.label}</p>
          <h2 className="mega mt-1.5 text-[1.55rem]">{step.title}</h2>
          <p className="mt-2 text-[14.5px] leading-snug text-muted">{step.text}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-[5px]" aria-hidden>
            {steps.map((_, k) => (
              <span key={k} className={`h-[6px] rounded-full transition-all duration-300 ${k === i ? "w-5 bg-sun" : "w-[6px] bg-line"}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? close() : setI(i + 1))}
            className="press shadow-primary flex items-center gap-1.5 rounded-full bg-sun px-5 py-3 text-[15px] font-extrabold text-white"
          >
            {last ? "Fertig" : "Weiter"} {!last && <Icon name="forward" size={16} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Knopf für Konto und Profil: Rundgang nochmal ansehen (startet auf der Startseite deines Reiseziels) */
export function TourReplay({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.setItem(TOUR_KEY, "again");
        } catch {
          // egal
        }
        // Echter Seitenwechsel, damit die Startseite frisch lädt und der Rundgang sicher startet
        if (window.location.pathname === "/") window.location.reload();
        else router.push("/");
      }}
      className={className}
    >
      <Icon name="discover" size={22} /> Rundgang nochmal ansehen
    </button>
  );
}
