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

function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const url = search ? `${pathname}?${search}` : pathname;
    const s = readStack();
    if (s[s.length - 1] === url) return;
    if (s[s.length - 2] === url) s.pop(); // Schritt zurück
    else s.push(url);
    writeStack(s);
  }, [pathname, search]);
  return null;
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
        if (readStack().length >= 2) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
