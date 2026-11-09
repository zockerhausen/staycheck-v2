"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * „Zurück“ soll dahin führen, wo man wirklich herkam – nicht auf eine feste Seite.
 * Dafür merkt sich NavTracker die Seiten dieses Tabs (nur im Browser, sessionStorage).
 * Gibt es keine vorherige Seite in der App (z. B. Link von außen geöffnet), geht es zu `fallback`.
 */
const KEY = "sc_nav";

function readStack(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeStack(s: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s.slice(-50)));
  } catch {
    /* privates Fenster o. Ä.: dann eben ohne Verlauf */
  }
}

// Wie kam die nächste Adresse zustande? Zurück/Vor im Browser (popstate) oder nur ersetzt (Filter, Reiter, Reisedaten)
let popped = false;
let replacing = false;
/** Vor einem Wechsel aufrufen, der keinen neuen Schritt im Verlauf anlegt (router.replace, history.replaceState) */
export function markReplace() {
  replacing = true;
}

function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const on = () => (popped = true);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  useEffect(() => {
    const url = search ? `${pathname}?${search}` : pathname;
    const s = readStack();
    if (popped) {
      // Zurück (oder Vor): bis zu dieser Seite kürzen; unbekannt = Vor
      popped = false;
      const i = s.lastIndexOf(url);
      if (i >= 0) s.length = i + 1;
      else s.push(url);
    } else if (replacing || s[s.length - 1] === url) {
      replacing = false;
      if (s.length) s[s.length - 1] = url;
      else s.push(url);
    } else s.push(url);
    writeStack(s);
  }, [pathname, search]);
  return null;
}

/** Gibt es in diesem Tab eine vorherige Seite unserer App? (sonst würde „Zurück“ die App verlassen) */
export function canGoBack(): boolean {
  // Moderne Browser: echte Antwort vom Browser (nur Seiten derselben Website zählen)
  const nav = (window as unknown as { navigation?: { currentEntry?: { index: number } } }).navigation;
  if (nav?.currentEntry && typeof nav.currentEntry.index === "number") return nav.currentEntry.index > 0;
  return readStack().length >= 2;
}

export function NavTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}

export default function BackButton({
  fallback,
  label = "Zurück",
  className,
  children,
}: {
  fallback: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      aria-label={label}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (canGoBack()) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
