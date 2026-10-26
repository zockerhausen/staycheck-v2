"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Symbole der unteren Leiste: kräftige Linie, aktiv in Orange
const TAB_ICONS = {
  home: ["M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14z", "M20 20l-4-4"],
  pin: ["M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z", "M12 7.4a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8z"],
  duel: ["M4 8h14l-3.5-3.5", "M20 16H6l3.5 3.5"],
  mark: ["M12 20s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"],
  user: ["M12 4.5a4 4 0 1 1 0 8a4 4 0 1 1 0-8z", "M4.5 20.5c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5"],
} as const;
type TabIcon = keyof typeof TAB_ICONS;

function TabSvg({ name }: { name: TabIcon }) {
  return (
    <svg width={25} height={25} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      {TAB_ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

type Item = { href: string; label: string; icon: TabIcon; match: (p: string) => boolean };

export default function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/quiz")) return null; // Im Quiz volle Konzentration

  const items: Item[] = [
    { href: "/", label: "Entdecken", icon: "home", match: (p) => p === "/" || ["/ergebnis", "/kiez", "/reise", "/ziel"].some((x) => p.startsWith(x)) },
    { href: "/check", label: "Lage-Check", icon: "pin", match: (p) => p.startsWith("/check") },
    { href: "/duell/hotels", label: "Duell", icon: "duel", match: (p) => p.startsWith("/duell") },
    { href: "/favoriten", label: "Gemerkt", icon: "mark", match: (p) => p.startsWith("/favoriten") },
    {
      href: loggedIn ? "/konto" : "/login",
      label: loggedIn ? "Konto" : "Anmelden",
      icon: "user",
      match: (p) => p.startsWith("/login") || p.startsWith("/konto") || p.startsWith("/profil"),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-sand/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid h-[76px] max-w-md grid-cols-5 pt-2.5">
        {items.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.label}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`group flex flex-col items-center gap-1 text-[12px] font-extrabold transition-colors ${active ? "text-sun" : "text-muted"}`}
            >
              <span className="flex h-[28px] items-center justify-center transition-transform duration-200 group-active:scale-90">
                <TabSvg name={it.icon} />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
