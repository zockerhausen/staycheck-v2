"use client";

import { useEffect, useState } from "react";
import { applyTheme, isDarkNow } from "@/components/ThemeSwitch";

/** Runder Knopf oben: wechselt mit einem Tipp zwischen hell und dunkel (Sonne/Mond). */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    setDark(isDarkNow());
    const sync = () => setDark(isDarkNow());
    window.addEventListener("sc-theme", sync);
    return () => window.removeEventListener("sc-theme", sync);
  }, []);

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDarkNow() ? "light" : "dark")}
      aria-label={dark ? "Helle Darstellung" : "Dunkle Darstellung"}
      className={`press flex shrink-0 items-center justify-center rounded-full border border-line bg-sand shadow-soft ${className}`}
    >
      <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  );
}
