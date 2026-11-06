"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";

/**
 * Feste Leiste über der Navigation (wie „Reservieren“ bei Airbnb): links das Wichtigste, rechts der Hauptknopf.
 * Per Portal an den Seitenrand gehängt, damit „fixed“ trotz animiertem Seitenrahmen funktioniert.
 */
export default function BookBar({ title, sub, href, label }: { title: string; sub: string; href: string; label: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(0.9rem,env(safe-area-inset-bottom))+80px)] z-30 px-3">
      <div className="glass shadow-nav pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-2.5 rounded-full border border-[var(--sc-glass-line)] py-2.5 pl-[18px] pr-2.5">
        <div className="min-w-0">
          <b className="block truncate text-[16px] font-extrabold">{title}</b>
          <span className="block truncate text-[13px] font-semibold text-muted">{sub}</span>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="press shadow-primary flex min-h-[3.1rem] shrink-0 items-center gap-2 rounded-full bg-sun px-5 text-[15px] font-extrabold text-white active:bg-sun-dark"
          onClick={() => {
            try {
              navigator.vibrate?.(10);
            } catch {
              /* egal */
            }
          }}
        >
          {label} <Icon name="external" size={17} fill="transparent" />
        </a>
      </div>
    </div>,
    document.body,
  );
}
