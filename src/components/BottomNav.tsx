"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Eigene Symbole nur für die untere Leiste: feine Linie, aktiv gefüllt (Variante „Mit Akzent“)
const TAB_ICONS = {
  home: [{ d: "M4 10.2L12 4l8 6.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" }],
  pin: [{ d: "M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z" }, { d: "M12 7.4a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8z", hole: true }],
  duel: [{ d: "M5.5 8h2.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM16 4h2.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" }],
  mark: [{ d: "M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.5L5.5 21V4.5a1 1 0 0 1 1-1z" }],
  user: [{ d: "M12 4.5a4 4 0 1 1 0 8a4 4 0 1 1 0-8z" }, { d: "M4.5 20.5c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5", line: true }],
} as const;
type TabIcon = keyof typeof TAB_ICONS;

function TabSvg({ name, active }: { name: TabIcon; active: boolean }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {TAB_ICONS[name].map((p, i) => {
        const hole = "hole" in p && p.hole;
        const line = "line" in p && p.line;
        if (active && hole) return <path key={i} d={p.d} fill="#2a160d" stroke="none" />;
        return <path key={i} d={p.d} fill={active && !line ? "currentColor" : "none"} />;
      })}
    </svg>
  );
}

type Item = { href: string; label: string; icon: TabIcon; match: (p: string) => boolean };

export default function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/quiz")) return null; // Im Quiz volle Konzentration

  const items: Item[] = [
    { href: "/", label: "Start", icon: "home", match: (p) => p === "/" || ["/ergebnis", "/kiez", "/reise"].some((x) => p.startsWith(x)) },
    { href: "/check", label: "Lage-Check", icon: "pin", match: (p) => p.startsWith("/check") },
    { href: "/duell/hotels", label: "Duell", icon: "duel", match: (p) => p.startsWith("/duell") },
    { href: "/favoriten", label: "Gemerkt", icon: "mark", match: (p) => p.startsWith("/favoriten") },
    {
      href: loggedIn ? "/konto" : "/login",
      label: loggedIn ? "Konto" : "Login",
      icon: "user",
      match: (p) => p.startsWith("/login") || p.startsWith("/konto") || p.startsWith("/profil"),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#1f1f22] bg-sand/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid h-[76px] max-w-md grid-cols-5 pt-2.5">
        {items.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.label}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`group flex flex-col items-center gap-[3px] text-[11px] font-semibold transition-colors ${active ? "text-sun-soft" : "text-faint"}`}
            >
              <span
                className={`flex h-[30px] w-[60px] items-center justify-center rounded-full transition group-active:scale-90 ${active ? "bg-sun/15" : ""}`}
              >
                <TabSvg name={it.icon} active={active} />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
