"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

const KEY = "sc-install-dismissed";
const PAUSE_DAYS = 21;

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Hinweis „StayCheck als App“: auf Android ein echter Installieren-Knopf, auf dem iPhone eine kurze Anleitung
 * (Safari kann nicht selbst installieren). Nur auf der Startseite, nur wenn noch nicht installiert, geschlossen = 3 Wochen Ruhe.
 */
export default function InstallHint() {
  const pathname = usePathname();
  const [mode, setMode] = useState<null | "ios" | "android">(null);
  const [shown, setShown] = useState(false);
  const promptRef = useRef<PromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem("sc-tour") !== "done") return; // erst der Rundgang, der Hinweis kommt beim nächsten Besuch
      const t = Number(localStorage.getItem(KEY) ?? 0);
      if (t && Date.now() - t < PAUSE_DAYS * 86_400_000) return;
    } catch {
      return; // ohne Speicher lieber gar nicht nerven
    }
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios|instagram|fban|fbav|line\//i.test(ua);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (ios && safari) timer = setTimeout(() => setMode("ios"), 4000);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as PromptEvent;
      timer = setTimeout(() => setMode("android"), 4000);
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!mode) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [mode]);

  if (!mode || pathname !== "/") return null;

  const close = () => {
    setShown(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* egal */
    }
    setTimeout(() => setMode(null), 300);
  };
  const install = async () => {
    const p = promptRef.current;
    if (!p) return;
    await p.prompt();
    const { outcome } = await p.userChoice.catch(() => ({ outcome: "dismissed" }));
    promptRef.current = null;
    if (outcome === "accepted") setMode(null);
    else close();
  };

  return (
    <div
      role="dialog"
      aria-label="StayCheck als App installieren"
      className={`fixed inset-x-3 z-30 mx-auto max-w-md transition-[transform,opacity] duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] bottom-[calc(max(0.9rem,env(safe-area-inset-bottom))+84px)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div className="glass flex items-center gap-3 rounded-[24px] border border-[var(--sc-glass-line)] p-3 shadow-nav">
        <img src="/icons/apple-touch-icon.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-[13px] shadow-soft" />
        <div className="min-w-0 flex-1">
          <b className="block text-[15px] font-extrabold">StayCheck als App</b>
          {mode === "ios" ? (
            <p className="text-[13px] font-semibold leading-snug text-muted">
              Tippe unten auf <ShareGlyph /> und dann auf <b className="text-ink">„Zum Home-Bildschirm“</b>.
            </p>
          ) : (
            <p className="text-[13px] font-semibold leading-snug text-muted">Mit eigenem Icon, schneller Start, ohne Browser-Leiste.</p>
          )}
        </div>
        {mode === "android" && (
          <button type="button" onClick={install} className="press shrink-0 rounded-full bg-sun px-4 py-2.5 text-[14px] font-extrabold text-white">
            Installieren
          </button>
        )}
        <button type="button" onClick={close} aria-label="Hinweis schließen" className="press -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}

/** Das Teilen-Symbol von Safari (Kästchen mit Pfeil nach oben) */
function ShareGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5 text-sun-soft" aria-label="Teilen">
      <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
      <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
    </svg>
  );
}
