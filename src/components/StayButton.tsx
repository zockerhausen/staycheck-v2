"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import type { IconName } from "@/lib/icons";

/**
 * Schwebender Knopf über der unteren Leiste: führt zu den Unterkünften.
 * Erscheint erst nach etwas Scrollen und verschwindet, solange die Unterkünfte im Bild sind.
 */
export default function StayButton({
  targetId,
  label,
  icon = "hotel",
  tone = "accent",
}: {
  targetId: string;
  label: string;
  icon?: IconName;
  /** „ink“ = dunkle Pille wie bei Airbnb („Karte“), sonst orange */
  tone?: "accent" | "ink";
}) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Sichtbar, wenn die Unterkünfte gerade nicht deutlich im Bild sind (nur ein Rand zählt nicht)
    const update = () => {
      const t = document.getElementById(targetId);
      if (!t) return setShow(false);
      const r = t.getBoundingClientRect();
      const vh = window.innerHeight;
      const visible = r.top < vh * 0.65 && r.bottom > vh * 0.35;
      setShow(!visible && window.scrollY > 260);
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  if (!mounted) return null;
  // Per Portal an den Seitenrand gehängt (der animierte Seitenrahmen würde „fixed“ sonst verschieben)
  return createPortal(
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 transition-all duration-200 ${
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <button
        type="button"
        tabIndex={show ? 0 : -1}
        onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className={`press flex ${show ? "pointer-events-auto" : "pointer-events-none"} items-center gap-2 rounded-full px-5 py-3 text-[15px] font-extrabold shadow-[0_10px_30px_rgba(0,0,0,.28)] ${
          tone === "ink" ? "bg-ink text-sand" : "bg-sun text-white"
        }`}
      >
        {label} <Icon name={icon} size={18} fill="transparent" />
      </button>
    </div>,
    document.body,
  );
}
