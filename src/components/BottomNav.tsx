"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Symbole der unteren Leiste: kräftige Linie, aktiv violett gefüllt mit pinkem Punkt darunter
const TAB_ICONS = {
  home: ["M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14z", "M20 20l-4-4"],
  pin: ["M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z", "M12 7.4a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 1 1 0-4.8z"],
  duel: ["M4 8h14l-3.5-3.5", "M20 16H6l3.5 3.5"],
  mark: ["M12 20s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"],
  user: ["M12 4.5a4 4 0 1 1 0 8a4 4 0 1 1 0-8z", "M4.5 20.5c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5"],
} as const;
type TabIcon = keyof typeof TAB_ICONS;

function TabSvg({ name, size = 24, filled = false }: { name: TabIcon; size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      fill={filled ? "currentColor" : "none"}
      fillOpacity={filled ? 0.18 : undefined}
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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

  const discover: Item = { href: "/", label: "Entdecken", icon: "home", match: (p) => p === "/" || ["/ergebnis", "/kiez", "/reise", "/ziel"].some((x) => p.startsWith(x)) };
  const duel: Item = { href: "/duell/hotels", label: "Duell", icon: "duel", match: (p) => p.startsWith("/duell") };
  const saved: Item = { href: "/favoriten", label: "Gemerkt", icon: "mark", match: (p) => p.startsWith("/favoriten") };
  const account: Item = {
    href: loggedIn ? "/konto" : "/login",
    label: loggedIn ? "Konto" : "Anmelden",
    icon: "user",
    match: (p) => p.startsWith("/login") || p.startsWith("/konto") || p.startsWith("/profil"),
  };
  const checkActive = pathname.startsWith("/check");

  const tab = (it: Item) => {
    const active = it.match(pathname);
    return (
      <Link
        key={it.label}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={`group relative flex flex-col items-center gap-[3px] text-[11.5px] font-bold transition-colors ${active ? "text-sun-soft" : "text-muted"}`}
      >
        <span className="flex h-[26px] items-center justify-center transition-transform duration-200 group-active:scale-90">
          <TabSvg name={it.icon} filled={active} />
        </span>
        {it.label}
        {active && <span aria-hidden className="dot-pink absolute -bottom-[9px] !h-[5px] !w-[5px]" />}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
      <div className="glass shadow-nav mx-auto grid h-[72px] max-w-md grid-cols-[1fr_1fr_1.1fr_1fr_1fr] items-center rounded-[28px] border border-[var(--sc-glass-line)] px-1.5">
        {tab(discover)}
        {tab(duel)}
        {/* Mitte: der Lage-Check – die wichtigste Aktion der App, deshalb groß und violett */}
        <Link
          href="/check"
          aria-label="Lage-Check: Unterkunft prüfen"
          aria-current={checkActive ? "page" : undefined}
          className="group flex flex-col items-center"
        >
          <span
            className={`shadow-primary -mt-[26px] flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-full border-4 border-sand bg-sun text-white transition-transform duration-300 group-active:scale-90 ${checkActive ? "ring-pink" : ""}`}
          >
            <TabSvg name="pin" size={26} />
          </span>
          <span className={`mt-1 text-[11.5px] font-bold ${checkActive ? "text-sun-soft" : "text-muted"}`}>Lage-Check</span>
        </Link>
        {tab(saved)}
        {tab(account)}
      </div>
    </nav>
  );
}
