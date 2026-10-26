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
    <div className="glass fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 border-t border-line">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <b className="block truncate text-[16px] font-black">{title}</b>
          <span className="block truncate text-[13px] font-semibold text-muted">{sub}</span>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex shrink-0 items-center gap-2 rounded-2xl bg-sun px-5 py-3.5 text-[15px] font-extrabold text-white"
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
