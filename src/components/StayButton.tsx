"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";

/**
 * Schwebender Knopf über der unteren Leiste: führt zu den Unterkünften.
 * Erscheint erst nach etwas Scrollen und verschwindet, solange die Unterkünfte im Bild sind.
 */
export default function StayButton({ targetId, label }: { targetId: string; label: string }) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    let inView = false;
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      update();
    });
    io.observe(target);
    const update = () => setShow(!inView && window.scrollY > 260);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [targetId]);

  if (!mounted) return null;
  // Per Portal an den Seitenrand gehängt (der animierte Seitenrahmen würde „fixed“ sonst verschieben)
  return createPortal(
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 transition-all duration-200 ${
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <button
        type="button"
        tabIndex={show ? 0 : -1}
        onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="press pointer-events-auto flex items-center gap-2 rounded-full bg-sun px-5 py-3 text-[15px] font-bold text-white shadow-[0_10px_30px_rgba(242,102,47,.45)]"
      >
        <Icon name="hotel" size={18} /> {label}
      </button>
    </div>,
    document.body,
  );
}
