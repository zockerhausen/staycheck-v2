"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import DestinationSearch from "@/components/DestinationSearch";
import { clearTrip } from "@/app/actions";

/**
 * Stadt oben antippen = Fenster von unten zum Wechseln. Schließen behält die aktuelle Stadt,
 * eine neue Auswahl wird gemerkt (auf allen Seiten gleich).
 */
export default function CitySwitcher({
  current,
  verified,
  variant = "pill",
  hint = "Wo willst du schlafen?",
}: {
  current: string;
  verified: { slug: string; name: string; country: string }[];
  /** „bar“ = große Suchleiste oben auf der Startseite (wie bei Airbnb) */
  variant?: "pill" | "bar";
  hint?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // für die Animation

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setShown(false);
    setTimeout(() => setOpen(false), 220);
  }

  return (
    <>
      {variant === "bar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="press flex min-w-0 flex-1 items-center gap-3 rounded-full border border-line bg-sand py-2.5 pl-4 pr-5 text-left shadow-soft"
        >
          <Icon name="search" size={22} className="shrink-0" fill="transparent" />
          <span className="min-w-0 leading-tight">
            <b className="block truncate text-[16px] font-black">{current}</b>
            <span className="block truncate text-[13px] font-semibold text-muted">{hint}</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="press flex max-w-[55vw] items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-bold"
        >
          <Icon name="plane" size={15} className="shrink-0" /> <span className="truncate">{current}</span>
          <Icon name="down" size={14} className="shrink-0" />
        </button>
      )}

      {open &&
        createPortal(
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Reiseziel wechseln">
          <button
            type="button"
            aria-label="Schließen"
            onClick={close}
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
          />
          <div
            className={`absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-[28px] border-t border-line bg-sand px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,.25)] transition-transform duration-200 ease-out ${
              shown ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-raised" />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[22px] font-black">Wohin geht&apos;s?</h2>
              <button type="button" onClick={close} aria-label="Schließen" className="press flex h-10 w-10 items-center justify-center rounded-full bg-tan">
                <Icon name="close" size={16} />
              </button>
            </div>
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-tan px-3.5 py-3 text-sm">
              <Icon name="check" size={16} className="shrink-0 text-good" /> Aktuell: <b>{current}</b>
            </p>
            <div className="mt-4">
              <DestinationSearch verified={verified} onPick={close} />
            </div>
            <button
              type="button"
              onClick={async () => {
                close();
                await clearTrip();
                router.push("/");
              }}
              className="mt-6 w-full py-2 text-center text-sm font-semibold text-faint"
            >
              Reiseziel entfernen
            </button>
          </div>
        </div>,
          document.body, // außerhalb des Seitenrahmens, damit es wirklich von unten über allem liegt
        )}
    </>
  );
}
